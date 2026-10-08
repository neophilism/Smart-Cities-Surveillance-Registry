-- Smart Cities downstream application boundary.
-- Prevent operationally sensitive values from entering a public lifecycle state
-- unless the specific field is already redacted/withheld.

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

  IF value_text ~* '(^|[^0-9])10\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}([^0-9]|$)'
     OR value_text ~* '(^|[^0-9])192\.168\.[0-9]{1,3}\.[0-9]{1,3}([^0-9]|$)'
     OR value_text ~* '(^|[^0-9])172\.(1[6-9]|2[0-9]|3[0-1])\.[0-9]{1,3}\.[0-9]{1,3}([^0-9]|$)'
     OR value_text ~* '(^|[^0-9])127\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}([^0-9]|$)'
     OR value_text ~* '(^|[^0-9])169\.254\.[0-9]{1,3}\.[0-9]{1,3}([^0-9]|$)'
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

CREATE OR REPLACE FUNCTION smart_cities_enforce_public_safety()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  item record;
  issue text;
  protected boolean;
BEGIN
  IF NEW.registry_id <> 'smart-cities-surveillance-registry'
     OR NEW.visibility <> 'public'
     OR NEW.status NOT IN ('published', 'withdrawn', 'superseded', 'archived')
  THEN
    RETURN NEW;
  END IF;

  FOR item IN
    SELECT key AS field_id, value AS field_value
    FROM jsonb_each(NEW.fields)
  LOOP
    SELECT EXISTS (
      SELECT 1
      FROM civic_registry_field_disclosures disclosure
      WHERE disclosure.registry_id = NEW.registry_id
        AND disclosure.record_id = NEW.id
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
      RAISE EXCEPTION
        'Smart Cities public-safety boundary rejected field % (%). Redact or withhold the field before publication.',
        item.field_id,
        issue
        USING ERRCODE = '23514';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS smart_cities_public_safety_guard
  ON civic_registry_records;

CREATE TRIGGER smart_cities_public_safety_guard
BEFORE INSERT OR UPDATE OF fields, status, visibility
ON civic_registry_records
FOR EACH ROW
EXECUTE FUNCTION smart_cities_enforce_public_safety();
