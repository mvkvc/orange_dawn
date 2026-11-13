defmodule OrangeDawnWeb.UserSessionController do
  use OrangeDawnWeb, :controller
  alias OrangeDawn.Accounts
  alias OrangeDawn.Accounts.UserToken

  def create(conn, %{"user" => %{"token" => token}}) when is_binary(token) do
    with {:ok, _} <- UserToken.verify_magic_link_token_query(token),
         {:ok, {user, _}} <- Accounts.login_user_by_magic_link(token) do
      render_session(conn, user)
    else
      _ -> unauthorized(conn)
    end
  end

  def create(conn, %{"user" => %{"email" => email}}) when is_binary(email) do
    case Accounts.get_user_by_email(email) do
      nil -> json(conn, %{message: "Check your email for a sign-in link."})
      user -> deliver_link(conn, user, :ok)
    end
  end

  def create(conn, _params), do: unauthorized(conn)

  def deliver_link(conn, user, status) do
    case Accounts.deliver_login_instructions(user, &login_url/1) do
      {:ok, _} ->
        conn |> put_status(status) |> json(%{message: "Check your email for a sign-in link."})

      {:error, _} ->
        conn
        |> put_status(:service_unavailable)
        |> json(%{
          errors: %{detail: "Unable to send email. Please try logging in again shortly."}
        })
    end
  end

  def login_url(token) do
    Application.fetch_env!(:orange_dawn, :frontend_url) <> "/#login=" <> token
  end

  def show(conn, _params) do
    json(conn, %{user: public_user(conn.assigns.current_scope.user)})
  end

  def delete(conn, _params) do
    Accounts.delete_user_api_token(conn.assigns.api_token)

    OrangeDawnWeb.Endpoint.broadcast(
      "users_socket:#{conn.assigns.current_scope.user.id}",
      "disconnect",
      %{}
    )

    send_resp(conn, :no_content, "")
  end

  def render_session(conn, user) do
    conn
    |> put_resp_header("cache-control", "no-store")
    |> json(%{user: public_user(user), token: Accounts.create_user_api_token(user)})
  end

  defp public_user(user), do: %{id: user.id, email: user.email}

  defp unauthorized(conn) do
    conn
    |> put_status(:unauthorized)
    |> json(%{errors: %{detail: "The sign-in link is invalid or expired."}})
  end
end
