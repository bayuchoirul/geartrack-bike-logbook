-- ============================================================================
-- GEARTRACK / BIKE LOGBOOK TELEMETRY v2.4 - SUPABASE SCHEMA & TRIGGERS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE public.bikes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    subtitle TEXT,
    chassis_spec TEXT,
    groupset_spec TEXT,
    drivetrain_ratio TEXT,
    wheel_tire_spec TEXT,
    tire_pressure_psi TEXT,
    odometer_km NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'in_service' CHECK (status IN ('in_service', 'standby', 'retired')),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    is_default BOOLEAN NOT NULL DEFAULT false,
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.component_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_name TEXT NOT NULL UNIQUE,
    badge_label TEXT NOT NULL,
    description TEXT,
    default_max_km NUMERIC(10, 2) NOT NULL,
    default_max_months INTEGER NOT NULL,
    warn_threshold_pct INTEGER NOT NULL DEFAULT 75,
    crit_threshold_pct INTEGER NOT NULL DEFAULT 90,
    calibration_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.components (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bike_id UUID NOT NULL REFERENCES public.bikes(id) ON DELETE CASCADE,
    rule_id UUID REFERENCES public.component_rules(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    icon_name TEXT DEFAULT 'settings',
    installed_date DATE NOT NULL DEFAULT CURRENT_DATE,
    installed_at_bike_km NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    logged_km NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    interval_km NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    max_lifespan_km NUMERIC(10, 2) NOT NULL,
    max_lifespan_months INTEGER NOT NULL DEFAULT 12,
    purchase_cost_idr NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    retired_date DATE,
    retirement_reason TEXT,
    retirement_badge TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bike_id UUID NOT NULL REFERENCES public.bikes(id) ON DELETE CASCADE,
    strava_activity_id BIGINT UNIQUE,
    title TEXT NOT NULL,
    ride_type TEXT NOT NULL DEFAULT 'Road' CHECK (ride_type IN ('Road', 'Gravel', 'Commute', 'Trainer/Ind.')),
    ride_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    distance_km NUMERIC(10, 2) NOT NULL CHECK (distance_km > 0),
    elevation_gain_m NUMERIC(8, 1) DEFAULT 0,
    elapsed_seconds INTEGER DEFAULT 0,
    avg_speed_kmh NUMERIC(5, 2),
    avg_power_w INTEGER,
    source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('strava', 'manual', 'garmin')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.maintenance_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bike_id UUID NOT NULL REFERENCES public.bikes(id) ON DELETE CASCADE,
    component_id UUID REFERENCES public.components(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('reset', 'replace', 'service')),
    title TEXT NOT NULL,
    service_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    odometer_at_service NUMERIC(10, 2) NOT NULL,
    cost_idr NUMERIC(12, 2) NOT NULL DEFAULT 0,
    expense_category TEXT DEFAULT 'Lube/Consum.' CHECK (expense_category IN ('Parts Purchase', 'Workshop Labor', 'Lube/Consum.')),
    workshop_name TEXT DEFAULT 'Self-maintained (Home Workshop)',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.rider_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    rider_name TEXT NOT NULL DEFAULT 'Bayu Choirul Imam',
    handle TEXT NOT NULL DEFAULT '@bayu_rides',
    location TEXT DEFAULT 'Depok & Jakarta, ID',
    ftp_watts INTEGER DEFAULT 245,
    weight_kg NUMERIC(5, 2) DEFAULT 65.0,
    tire_pressure_unit TEXT DEFAULT 'PSI',
    cost_ceiling_per_km NUMERIC(10, 2) DEFAULT 500,
    strava_connected BOOLEAN DEFAULT false,
    strava_refresh_token TEXT,
    google_sheet_id TEXT,
    last_sheets_sync TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE VIEW public.components_telemetry_view AS
SELECT 
    c.*,
    b.name AS bike_name,
    ROUND((c.logged_km / NULLIF(c.max_lifespan_km, 0)) * 100, 1) AS km_wear_pct,
    ROUND(
        ((EXTRACT(EPOCH FROM (COALESCE(c.retired_date::timestamptz, NOW()) - c.installed_date::timestamptz)) / 2592000.0) 
        / NULLIF(c.max_lifespan_months, 0)) * 100, 1
    ) AS time_wear_pct,
    GREATEST(
        ROUND((c.logged_km / NULLIF(c.max_lifespan_km, 0)) * 100, 1),
        ROUND(
            ((EXTRACT(EPOCH FROM (COALESCE(c.retired_date::timestamptz, NOW()) - c.installed_date::timestamptz)) / 2592000.0) 
            / NULLIF(c.max_lifespan_months, 0)) * 100, 1
        )
    ) AS effective_wear_pct,
    CASE 
        WHEN c.logged_km > 0 THEN ROUND(c.purchase_cost_idr / c.logged_km, 1)
        ELSE 0 
    END AS cost_per_km_idr
FROM public.components c
JOIN public.bikes b ON c.bike_id = b.id;

CREATE OR REPLACE FUNCTION public.handle_new_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.bikes
    SET odometer_km = odometer_km + NEW.distance_km,
        updated_at = NOW()
    WHERE id = NEW.bike_id;

    UPDATE public.components
    SET logged_km = logged_km + NEW.distance_km,
        interval_km = interval_km + NEW.distance_km,
        updated_at = NOW()
    WHERE bike_id = NEW.bike_id AND status = 'active';

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_after_insert_activity
AFTER INSERT ON public.activities
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_activity();

CREATE OR REPLACE FUNCTION public.archive_and_replace_component(
    p_old_component_id UUID,
    p_retirement_reason TEXT,
    p_retirement_badge TEXT,
    p_new_component_name TEXT,
    p_new_max_lifespan_km NUMERIC,
    p_new_max_lifespan_months INTEGER,
    p_new_cost_idr NUMERIC,
    p_service_date TIMESTAMPTZ,
    p_workshop_name TEXT,
    p_notes TEXT
)
RETURNS UUID AS $$
DECLARE
    v_old_comp RECORD;
    v_bike_odo NUMERIC;
    v_new_comp_id UUID;
BEGIN
    SELECT * INTO v_old_comp FROM public.components WHERE id = p_old_component_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Component not found';
    END IF;

    SELECT odometer_km INTO v_bike_odo FROM public.bikes WHERE id = v_old_comp.bike_id;

    UPDATE public.components
    SET status = 'archived',
        retired_date = p_service_date::date,
        retirement_reason = p_retirement_reason,
        retirement_badge = p_retirement_badge,
        updated_at = NOW()
    WHERE id = p_old_component_id;

    INSERT INTO public.components (
        bike_id, rule_id, name, category, icon_name,
        installed_date, installed_at_bike_km, logged_km, interval_km,
        max_lifespan_km, max_lifespan_months, purchase_cost_idr, status, notes
    ) VALUES (
        v_old_comp.bike_id, v_old_comp.rule_id, p_new_component_name, v_old_comp.category, v_old_comp.icon_name,
        p_service_date::date, v_bike_odo, 0, 0,
        p_new_max_lifespan_km, p_new_max_lifespan_months, p_new_cost_idr, 'active', p_notes
    ) RETURNING id INTO v_new_comp_id;

    INSERT INTO public.maintenance_logs (
        bike_id, component_id, action_type, title, service_date,
        odometer_at_service, cost_idr, expense_category, workshop_name, notes
    ) VALUES (
        v_old_comp.bike_id, v_new_comp_id, 'replace',
        'Replaced ' || v_old_comp.name || ' -> ' || p_new_component_name,
        p_service_date, v_bike_odo, p_new_cost_idr, 'Parts Purchase', p_workshop_name, p_notes
    );

    RETURN v_new_comp_id;
END;
$$ LANGUAGE plpgsql;

INSERT INTO public.rider_settings (id, rider_name, handle, location)
VALUES (1, 'Bayu Choirul Imam', '@bayu_rides', 'Depok & Jakarta, ID')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.component_rules (category_name, badge_label, description, default_max_km, default_max_months, warn_threshold_pct, crit_threshold_pct, calibration_note) VALUES
('Bicycle Chain', 'Critical Part', 'Pin stretch & roller pitch degradation.', 3000, 6, 75, 90, 'Calibrated: 0.5% - 0.75% wear gauge'),
('Cassette Sprocket', 'Drivetrain', 'Tooth hook profile & shifting burrs.', 8000, 24, 80, 95, 'Pairs with ~2-3 chain replacements'),
('Tires (Front/Rear)', 'Rolling Stock', 'Tread depth center line & puncture rate.', 3500, 12, 70, 90, 'Rear wears ~2x faster than front'),
('Brake Pads (Resin)', 'Safety Core', 'Compound thickness down to 0.5mm limit.', 3000, 12, 75, 85, 'Wet gravel degrades at double rate'),
('Bottom Bracket', 'Bearings', 'Sealed cartridge spindle play & resistance.', 12000, 24, 85, 95, 'BSA Threaded 68mm standard'),
('Wheel Bearings', 'Hubs', 'Sealed cartridge hub bearing smoothness.', 10000, 24, 80, 95, 'Enduro 6903-LLB ABEC 3 spec');

DO $$
DECLARE
    v_bike_id UUID;
BEGIN
    INSERT INTO public.bikes (
        name, subtitle, chassis_spec, groupset_spec, drivetrain_ratio,
        wheel_tire_spec, tire_pressure_psi, odometer_km, status, is_default
    ) VALUES (
        'Polygon Path X4',
        'Custom #ff3989 Chiba • Endurance Road & Gravel',
        'ALX Alloy Hydroformed • BB68 Threaded',
        'Shimano 105 R7000 11-Speed',
        '50-34T chainring • 11-36T cassette',
        'Fulcrum Racing 7 DB • 700x32c / 700x38c',
        '55 PSI Road / 42 PSI Gravel',
        3842.50,
        'in_service',
        true
    ) RETURNING id INTO v_bike_id;

    INSERT INTO public.components (bike_id, name, category, icon_name, installed_date, logged_km, interval_km, max_lifespan_km, max_lifespan_months, purchase_cost_idr, status, notes) VALUES
    (v_bike_id, 'Shimano HG-601 11-Speed Chain', 'Drivetrain', 'link', CURRENT_DATE - INTERVAL '5 months', 2760, 185, 3000, 6, 320000, 'active', 'Check with 0.75 wear gauge; approaching replacement limit.'),
    (v_bike_id, 'Shimano 105 CS-HG700 11-36T', 'Drivetrain', 'settings', CURRENT_DATE - INTERVAL '11 months', 3842.5, 3842.5, 8000, 24, 650000, 'active', 'Teeth profiling intact; smooth indexing across 11-speed range.'),
    (v_bike_id, 'Vittoria Terreno Dry 700x38c (Rear)', 'Wheelset (Rear)', 'tire_repair', CURRENT_DATE - INTERVAL '6 months', 2590, 420, 3500, 12, 480000, 'active', 'Center file tread thinning; monitor puncture resistance.'),
    (v_bike_id, 'Vittoria Terreno Dry 700x38c (Front)', 'Wheelset (Front)', 'tire_repair', CURRENT_DATE - INTERVAL '6 months', 1330, 420, 3500, 12, 480000, 'active', 'Side knobs robust, nominal wear.'),
    (v_bike_id, 'Shimano L05A Resin Disc Pads', 'Brakes (F/R)', 'album', CURRENT_DATE - INTERVAL '4 months', 2040, 2040, 3000, 12, 220000, 'active', 'Pad thickness ~1.2mm; inspect before long climbs.'),
    (v_bike_id, 'BB68 Threaded Sealed Bottom Bracket', 'Chassis Bearing', 'trip_origin', CURRENT_DATE - INTERVAL '11 months', 3842.5, 520, 12000, 24, 275000, 'active', 'BB68 drat; seals intact, zero lateral play.');
END $$;

ALTER TABLE public.bikes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.component_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rider_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users manage own or legacy bikes" ON public.bikes FOR ALL TO authenticated USING (user_id = auth.uid() OR user_id IS NULL) WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "Allow all access rules" ON public.component_rules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access components" ON public.components FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access activities" ON public.activities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access maintenance" ON public.maintenance_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access settings" ON public.rider_settings FOR ALL USING (true) WITH CHECK (true);
