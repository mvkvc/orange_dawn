defmodule OrangeDawnWeb.UserSocket do
  use Phoenix.Socket
  alias OrangeDawn.Accounts
  alias OrangeDawn.Accounts.Scope

  channel "lobby:*", OrangeDawnWeb.LobbyChannel

  @impl true
  def connect(_params, socket, %{session: %{"user_token" => token}}) do
    case Accounts.get_user_by_session_token(token) do
      {user, _inserted_at} -> {:ok, assign(socket, :current_scope, Scope.for_user(user))}
      _ -> :error
    end
  end

  def connect(_params, _socket, _connect_info), do: :error

  @impl true
  def id(socket), do: "users_socket:#{socket.assigns.current_scope.user.id}"
end
