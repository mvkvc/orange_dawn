defmodule OrangeDawnWeb.UserAuth do
  @moduledoc "Bearer authentication for JSON routes."
  import Plug.Conn
  import Phoenix.Controller, only: [json: 2]
  alias OrangeDawn.Accounts
  alias OrangeDawn.Accounts.Scope

  def fetch_current_scope_for_api_user(conn, _opts) do
    with [<<bearer::binary-size(6), " ", token::binary>>] <- get_req_header(conn, "authorization"),
         true <- String.downcase(bearer) == "bearer",
         {:ok, user} <- Accounts.fetch_user_by_api_token(token) do
      conn
      |> assign(:current_scope, Scope.for_user(user))
      |> assign(:api_token, token)
    else
      _ ->
        conn
        |> put_status(:unauthorized)
        |> json(%{errors: %{detail: "Please log in to continue."}})
        |> halt()
    end
  end
end
