import type {
  CompiledRegistryConfig,
} from "@civic-registry/config";

import {
  firstSearchValue,
  type PublicSearchParams,
} from "../lib/search-params";
import type {
  SmartCitiesAdvancedFilterOptions,
  SmartCitiesFilterOption,
} from "../lib/smart-cities-search";

function selectOptions(
  registry: CompiledRegistryConfig,
  recordTypeId: string,
  fieldId: string,
): SmartCitiesFilterOption[] {
  return (
    registry.getField(
      recordTypeId,
      fieldId,
    ).options?.map((option) => ({
      value: option.value,
      label: option.label,
    })) ?? []
  );
}

function FilterSelect({
  label,
  name,
  selected,
  options,
}: {
  label: string;
  name: string;
  selected?: string;
  options: SmartCitiesFilterOption[];
}) {
  return (
    <label className="search-field">
      <span>{label}</span>
      <select
        name={name}
        defaultValue={selected ?? ""}
      >
        <option value="">Any</option>
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SmartCitiesAdvancedFilterFields({
  registry,
  params,
  options,
}: {
  registry: CompiledRegistryConfig;
  params: PublicSearchParams;
  options: SmartCitiesAdvancedFilterOptions;
}) {
  return (
    <>
      <div className="search-filter-divider">
        <span>
          Smart Cities accountability filters
        </span>
      </div>

      <FilterSelect
        label="Jurisdiction"
        name="sc_jurisdiction"
        selected={firstSearchValue(
          params.sc_jurisdiction,
        )}
        options={options.jurisdictions}
      />

      <FilterSelect
        label="Agency"
        name="sc_agency"
        selected={firstSearchValue(
          params.sc_agency,
        )}
        options={options.agencies}
      />

      <FilterSelect
        label="Vendor"
        name="sc_vendor"
        selected={firstSearchValue(
          params.sc_vendor,
        )}
        options={options.vendors}
      />

      <FilterSelect
        label="Technology type"
        name="sc_technology"
        selected={firstSearchValue(
          params.sc_technology,
        )}
        options={selectOptions(
          registry,
          "technology",
          "category",
        )}
      />

      <FilterSelect
        label="Deployment status"
        name="sc_deployment_status"
        selected={firstSearchValue(
          params.sc_deployment_status,
        )}
        options={selectOptions(
          registry,
          "deployment",
          "deployment_status",
        )}
      />

      <FilterSelect
        label="Data category"
        name="sc_data_category"
        selected={firstSearchValue(
          params.sc_data_category,
        )}
        options={selectOptions(
          registry,
          "deployment",
          "data_categories",
        )}
      />

      <fieldset className="search-range">
        <legend>Retention days</legend>
        <label>
          <span>Minimum</span>
          <input
            name="sc_retention_min"
            type="number"
            min="0"
            step="1"
            defaultValue={
              firstSearchValue(
                params.sc_retention_min,
              ) ?? ""
            }
          />
        </label>
        <label>
          <span>Maximum</span>
          <input
            name="sc_retention_max"
            type="number"
            min="0"
            step="1"
            defaultValue={
              firstSearchValue(
                params.sc_retention_max,
              ) ?? ""
            }
          />
        </label>
      </fieldset>

      <FilterSelect
        label="Legal process"
        name="sc_legal_process"
        selected={firstSearchValue(
          params.sc_legal_process,
        )}
        options={selectOptions(
          registry,
          "deployment",
          "legal_process_requirement",
        )}
      />

      <FilterSelect
        label="Policy status"
        name="sc_policy_status"
        selected={firstSearchValue(
          params.sc_policy_status,
        )}
        options={selectOptions(
          registry,
          "policy",
          "policy_status",
        )}
      />

      <FilterSelect
        label="Audit status"
        name="sc_audit_status"
        selected={firstSearchValue(
          params.sc_audit_status,
        )}
        options={selectOptions(
          registry,
          "audit",
          "overall_status",
        )}
      />

      <FilterSelect
        label="Incident status"
        name="sc_incident_status"
        selected={firstSearchValue(
          params.sc_incident_status,
        )}
        options={selectOptions(
          registry,
          "violation",
          "incident_status",
        )}
      />
    </>
  );
}
