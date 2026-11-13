defmodule OrangeDawnWeb.UserRegistrationController do
  use OrangeDawnWeb, :controller
  alias OrangeDawn.Accounts

  def create(conn, %{"user" => attrs}) when is_map(attrs) do
    case Accounts.register_user(attrs) do
      {:ok, user} ->
        OrangeDawnWeb.UserSessionController.deliver_link(conn, user, :created)

      {:error, changeset} ->
        errors = Ecto.Changeset.traverse_errors(changeset, &translate_error/1)

        conn |> put_status(:unprocessable_entity) |> json(%{errors: errors})
    end
  end

  def create(conn, _params) do
    conn
    |> put_status(:unprocessable_entity)
    |> json(%{errors: %{detail: "Expected user credentials."}})
  end

  defp translate_error({message, opts}) do
    Enum.reduce(opts, message, fn {key, value}, acc ->
      String.replace(acc, "%{#{key}}", to_string(value))
    end)
  end
end
