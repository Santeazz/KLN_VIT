CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
  CREATE TYPE users_role_enum AS ENUM ('admin', 'manager', 'observer', 'hr');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE observations_status_enum AS ENUM ('draft', 'signed', 'archived');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE observation_signatures_signer_role_enum AS ENUM ('employee', 'observer');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_number varchar NOT NULL UNIQUE,
  personnel_number varchar NOT NULL UNIQUE,
  last_name varchar NOT NULL,
  first_name varchar NOT NULL,
  middle_name varchar,
  role users_role_enum NOT NULL DEFAULT 'observer',
  password_hash varchar NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_number varchar NOT NULL UNIQUE,
  personnel_number varchar NOT NULL UNIQUE,
  last_name varchar NOT NULL,
  first_name varchar NOT NULL,
  middle_name varchar,
  position varchar NOT NULL,
  hire_date date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS checklist_templates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title varchar NOT NULL,
  position varchar NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS checklist_criteria (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id uuid NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 1,
  title varchar NOT NULL,
  description text NOT NULL,
  max_score numeric(6, 2) NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS observations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL REFERENCES employees(id),
  observer_id uuid NOT NULL REFERENCES users(id),
  template_id uuid NOT NULL REFERENCES checklist_templates(id),
  observation_date date NOT NULL,
  position varchar NOT NULL,
  status observations_status_enum NOT NULL DEFAULT 'draft',
  total_score numeric(8, 2) NOT NULL DEFAULT 0,
  max_score numeric(8, 2) NOT NULL DEFAULT 0,
  percentage numeric(6, 2) NOT NULL DEFAULT 0,
  violations_count integer NOT NULL DEFAULT 0,
  comment text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS observation_results (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  observation_id uuid NOT NULL REFERENCES observations(id) ON DELETE CASCADE,
  criterion_id uuid REFERENCES checklist_criteria(id),
  criterion_title varchar NOT NULL,
  criterion_description text NOT NULL,
  score numeric(6, 2) NOT NULL DEFAULT 0,
  max_score numeric(6, 2) NOT NULL DEFAULT 1,
  passed boolean NOT NULL,
  comment text
);

CREATE TABLE IF NOT EXISTS observation_signatures (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  observation_id uuid NOT NULL REFERENCES observations(id) ON DELETE CASCADE,
  signer_role observation_signatures_signer_role_enum NOT NULL,
  signed_by_name varchar NOT NULL,
  document_digest varchar NOT NULL,
  signed_digest text NOT NULL,
  raw_payload text,
  signed_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT uq_observation_signer UNIQUE (observation_id, signer_role)
);

CREATE INDEX IF NOT EXISTS idx_observations_period ON observations(observation_date);
CREATE INDEX IF NOT EXISTS idx_observations_employee ON observations(employee_id);
CREATE INDEX IF NOT EXISTS idx_observation_results_observation ON observation_results(observation_id);
