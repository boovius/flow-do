from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_KEY: str

    ALLOWED_ORIGINS: list[str] = ["http://localhost:5173"]

    # Secret used to authenticate calls to the internal /flow-up endpoint.
    # Set this to a long random string. Generate one with: openssl rand -hex 32
    CRON_SECRET: str = ""


settings = Settings()
