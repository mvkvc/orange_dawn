defmodule OrangeDawnWeb.UserAuth do
  @moduledoc "Phoenix session and persistent remember-me cookies for the SPA."
  import Plug.Conn
  import Phoenix.Controller, only: [json: 2, delete_csrf_token: 0]
  alias OrangeDawn.Accounts
  alias OrangeDawn.Accounts.Scope

  @remember_me_cookie "_orange_dawn_user_remember_me"
  @remember_me_options [
    sign: true,
    max_age: 14 * 24 * 60 * 60,
    same_site: "Lax",
    http_only: true,
    secure: Application.compile_env(:orange_dawn, :secure_cookies, false)
  ]

  def log_in_user(conn, user) do
    token = Accounts.generate_user_session_token(user)
    delete_csrf_token()

    conn
    |> configure_session(renew: true)
    |> clear_session()
    |> put_session(:user_token, token)
    |> put_resp_cookie(@remember_me_cookie, token, @remember_me_options)
  end

  def log_out_user(conn) do
    delete_csrf_token()

    conn
    |> configure_session(renew: true)
    |> clear_session()
    |> delete_resp_cookie(@remember_me_cookie, @remember_me_options)
  end

  def fetch_current_scope_for_user(conn, _opts) do
    conn = fetch_cookies(conn, signed: [@remember_me_cookie])
    token = get_session(conn, :user_token) || conn.cookies[@remember_me_cookie]

    case token && Accounts.get_user_by_session_token(token) do
      {user, inserted_at} ->
        conn =
          conn |> put_session(:user_token, token) |> assign(:current_scope, Scope.for_user(user))

        if DateTime.diff(DateTime.utc_now(), inserted_at, :day) >= 7,
          do: log_in_user(conn, user),
          else: conn

      _ ->
        assign(conn, :current_scope, nil)
    end
  end

  def require_authenticated_user(conn, _opts) do
    if conn.assigns.current_scope do
      conn
    else
      conn
      |> put_status(:unauthorized)
      |> json(%{errors: %{detail: "Please log in to continue."}})
      |> halt()
    end
  end
end
