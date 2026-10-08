-- Smart Cities downstream application boundary.
-- Prevent operationally sensitive values from entering a public lifecycle state
-- unless the affected field or whole record is already redacted/withheld.

CREATE OR REPLACE FUNCTION smart_cities_public_safety_issue(
  field_id text,
  field_value jsonb
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  value_text text := COALESCE(field_value #>> '{}', field_value::text, '');
  normalized_field text := lower(COALESCE(field_id, ''));
BEGIN
  IF normalized_field = ANY (ARRAY[
    'latitude',
    'longitude',
    'coordinates',
    'gps_coordinates',
    'device_ip',
    'ip_address',
    'mac_address',
    'ssid',
    'bssid',
    'username',
    'password',
    'api_key',
    'access_token',
    'client_secret',
    'secret',
    'device_id',
    'serial_number',
    'target_person',
    'target_name',
    'target_id',
    'subject_id',
    'person_id',
    'biometric_template',
    'raw_surveillance_data'
  ]) THEN
    RETURN 'forbidden_public_field';
  END IF;

  IF value_text ~* '(latitude|lat)[[:space:]]*[:=][[:space:]]*[-+]?[0-9]{1,2}\.[0-9]{4,}[^0-9]+(longitude|lon|lng)[[:space:]]*[:=][[:space:]]*[-+]?[0-9]{1,3}\.[0-9]{4,}' THEN
    RETURN 'precise_coordinates';
  END IF;

  IF value_text ~* '(gps|coordinates?)[[:space:]]*[:=][[:space:]]*[-+]?[0-9]{1,2}\.[0-9]{4,}[[:space:]]*,[[:space:]]*[-+]?[0-9]{1,3}\.[0-9]{4,}' THEN
    RETURN 'precise_coordinates';
  END IF;

  IF normalized_field = 'public_location_scope'
     AND value_text ~* '(^|[^0-9])[-+]?[0-9]{1,2}\.[0-9]{4,}[[:space:]]*,[[:space:]]*[-+]?[0-9]{1,3}\.[0-9]{4,}([^0-9]|$)'
  THEN
    RETURN 'precise_coordinates';
  END IF;

  IF value_text ~* '(^|[^0-9])10\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}([^0-9]|$)'
     OR value_text ~* '(^|[^0-9])192\.168\.[0-9]{1,3}\.[0-9]{1,3}([^0-9]|$)'
     OR value_text ~* '(^|[^0-9])172\.(1[6-9]|2[0-9]|3[0-1])\.[0-9]{1,3}\.[0-9]{1,3}([^0-9]|$)'
     OR value_text ~* '(^|[^0-9])127\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}([^0-9]|$)'
     OR value_text ~* '(^|[^0-9])169\.254\.[0-9]{1,3}\.[0-9]{1,3}([^0-9]|$)'
     OR value_text ~* '(^|[^0-9a-f])(fe8|fe9|fea|feb|fc|fd)[0-9a-f]*:'
  THEN
    RETURN 'private_network_address';
  END IF;

  IF value_text ~* '(^|[^0-9a-f])([0-9a-f]{2}[:-]){5}[0-9a-f]{2}([^0-9a-f]|$)' THEN
    RETURN 'hardware_address';
  END IF;

  IF value_text ~* '-----BEGIN[[:space:]]+(RSA |EC |OPENSSH )?PRIVATE KEY-----' THEN
    RETURN 'private_key_material';
  END IF;

  IF value_text ~* '(password|passwd|api[ _-]?key|access[ _-]?token|client[ _-]?secret|bearer)[[:space:]]*[:=][[:space:]]*[^[:space:],;]{8,}' THEN
    RETURN 'credential_material';
  END IF;

  IF value_text ~* '(target|subject|person)[ _-]?(id|identifier|name)[[:space:]]*[:=][[:space:]]*[^[:space:],;]{2,}' THEN
    RETURN 'individual_target_identifier';
  END IF;

  IF value_text ~* '(license[ _-]?plate|plate)[[:space:]]*[:=][[:space:]]*[A-Z0-9-]{4,12}([^A-Z0-9-]|$)' THEN
    RETURN 'personal_surveillance_identifier';
  END IF;

  IF value_text ~* '(biometric[ _-]?(template|identifier)|face[ _-]?template)[[:space:]]*[:=]' THEN
    RETURN 'personal_surveillance_identifier';
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION smart_cities_first_unsafe_public_field(
  p_registry_id text,
  p_record_id text,
  p_fields jsonb
)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  item record;
  issue text;
  protected boolean;
BEGIN
  FOR item IN
    SELECT key AS field_id, value AS field_value
    FROM jsonb_each(p_fields)
  LOOP
    SELECT EXISTS (
      SELECT 1
      FROM civic_registry_field_disclosures disclosure
      WHERE disclosure.registry_id = p_registry_id
        AND disclosure.record_id = p_record_id
        AND disclosure.field_id = item.field_id
        AND disclosure.disposition IN ('redacted', 'withheld')
    )
    INTO protected;

    IF protected THEN
      CONTINUE;
    END IF;

    issue := smart_cities_public_safety_issue(
      item.field_id,
      item.field_value
    );

    IF issue IS NOT NULL THEN
      RETURN item.field_id || ':' || issue;
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION smart_cities_enforce_public_safety()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  issue text;
  whole_record_withheld boolean;
  identifier jsonb;
  identifier_scheme text;
  identifier_value text;
  tag_value text;
BEGIN
  IF NEW.registry_id <> 'smart-cities-surveillance-registry'
     OR NEW.visibility <> 'public'
     OR NEW.status NOT IN ('published', 'withdrawn', 'superseded', 'archived')
  THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM civic_registry_record_disclosures disclosure
    WHERE disclosure.registry_id = NEW.registry_id
      AND disclosure.record_id = NEW.id
      AND disclosure.disposition = 'withheld'
  )
  INTO whole_record_withheld;

  IF whole_record_withheld THEN
    RETURN NEW;
  END IF;

  issue := smart_cities_first_unsafe_public_field(
    NEW.registry_id,
    NEW.id,
    NEW.fields
  );

  IF issue IS NOT NULL THEN
    RAISE EXCEPTION
      'Smart Cities public-safety boundary rejected %. Redact/withhold the field or withhold the whole record before publication.',
      issue
      USING ERRCODE = '23514';
  END IF;

  FOR identifier IN
    SELECT value
    FROM jsonb_array_elements(
      COALESCE(NEW.external_identifiers, '[]'::jsonb)
    )
  LOOP
    identifier_scheme := lower(
      COALESCE(identifier ->> 'scheme', '')
    );
    identifier_value := COALESCE(
      identifier ->> 'value',
      ''
    );

    IF identifier_scheme ~ '(target|subject|person|device|mac|ip|credential|secret|token)'
       OR smart_cities_public_safety_issue(
            identifier_scheme,
            to_jsonb(identifier_value)
          ) IS NOT NULL
    THEN
      RAISE EXCEPTION
        'Smart Cities public-safety boundary rejected external identifier scheme %.',
        identifier_scheme
        USING ERRCODE = '23514';
    END IF;
  END LOOP;

  FOREACH tag_value IN ARRAY COALESCE(NEW.tags, ARRAY[]::text[])
  LOOP
    issue := smart_cities_public_safety_issue(
      'tag',
      to_jsonb(tag_value)
    );

    IF issue IS NOT NULL THEN
      RAISE EXCEPTION
        'Smart Cities public-safety boundary rejected tag metadata (%).',
        issue
        USING ERRCODE = '23514';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$;

CREATE OR REPLACE FUNCTION smart_cities_guard_field_disclosure_release()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target record;
  issue text;
BEGIN
  IF OLD.registry_id <> 'smart-cities-surveillance-registry' THEN
    RETURN OLD;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM civic_registry_record_disclosures disclosure
    WHERE disclosure.registry_id = OLD.registry_id
      AND disclosure.record_id = OLD.record_id
      AND disclosure.disposition = 'withheld'
  ) THEN
    RETURN OLD;
  END IF;

  SELECT status, visibility, fields
  INTO target
  FROM civic_registry_records
  WHERE registry_id = OLD.registry_id
    AND id = OLD.record_id;

  IF NOT FOUND
     OR target.visibility <> 'public'
     OR target.status NOT IN ('published', 'withdrawn', 'superseded', 'archived')
  THEN
    RETURN OLD;
  END IF;

  issue := smart_cities_public_safety_issue(
    OLD.field_id,
    target.fields -> OLD.field_id
  );

  IF issue IS NOT NULL THEN
    RAISE EXCEPTION
      'Smart Cities public-safety boundary cannot remove disclosure protection from field % (%).',
      OLD.field_id,
      issue
      USING ERRCODE = '23514';
  END IF;

  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION smart_cities_guard_record_disclosure_release()
RETURNS trigger
LANGUAGE plpgsql
AS $
DECLARE
  target record;
  issue text;
BEGIN
  IF OLD.registry_id <> 'smart-cities-surveillance-registry'
     OR OLD.disposition <> 'withheld'
  THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  IF TG_OP = 'UPDATE'
     AND NEW.disposition = 'withheld'
  THEN
    RETURN NEW;
  END IF;

  SELECT status, visibility, fields
  INTO target
  FROM civic_registry_records
  WHERE registry_id = OLD.registry_id
    AND id = OLD.record_id;

  IF NOT FOUND
     OR target.visibility <> 'public'
     OR target.status NOT IN ('published', 'withdrawn', 'superseded', 'archived')
  THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  issue := smart_cities_first_unsafe_public_field(
    OLD.registry_id,
    OLD.record_id,
    target.fields
  );

  IF issue IS NOT NULL THEN
    RAISE EXCEPTION
      'Smart Cities public-safety boundary cannot expose withheld record while unsafe field % remains.',
      issue
      USING ERRCODE = '23514';
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$;

DROP TRIGGER IF EXISTS smart_cities_public_safety_guard
  ON civic_registry_records;

CREATE TRIGGER smart_cities_public_safety_guard
BEFORE INSERT OR UPDATE OF fields, status, visibility, external_identifiers, tags
ON civic_registry_records
FOR EACH ROW
EXECUTE FUNCTION smart_cities_enforce_public_safety();

DROP TRIGGER IF EXISTS smart_cities_field_disclosure_release_guard
  ON civic_registry_field_disclosures;

CREATE TRIGGER smart_cities_field_disclosure_release_guard
BEFORE DELETE
ON civic_registry_field_disclosures
FOR EACH ROW
EXECUTE FUNCTION smart_cities_guard_field_disclosure_release();

DROP TRIGGER IF EXISTS smart_cities_record_disclosure_release_guard
  ON civic_registry_record_disclosures;

CREATE TRIGGER smart_cities_record_disclosure_release_guard
BEFORE DELETE OR UPDATE OF disposition
ON civic_registry_record_disclosures
FOR EACH ROW
EXECUTE FUNCTION smart_cities_guard_record_disclosure_release();
