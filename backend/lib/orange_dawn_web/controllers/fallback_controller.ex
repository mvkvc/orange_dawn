defmodule OrangeDawnWeb.FallbackController do
  use OrangeDawnWeb, :controller

  def not_found(conn, _params) do
    conn
    |> put_status(:not_found)
    |> json(%{errors: %{detail: "Not Found"}})
  end
end
