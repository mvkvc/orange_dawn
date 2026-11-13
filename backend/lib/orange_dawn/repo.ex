defmodule OrangeDawn.Repo do
  use Ecto.Repo,
    otp_app: :orange_dawn,
    adapter: Ecto.Adapters.Postgres
end
