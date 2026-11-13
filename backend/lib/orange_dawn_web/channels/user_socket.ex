defmodule OrangeDawnWeb.UserSocket do
  use Phoenix.Socket
  alias OrangeDawn.Accounts
  alias OrangeDawn.Accounts.Scope

  channel "lobby:*", OrangeDawnWeb.LobbyChannel

  @impl true
  def connect(%{"token" => token}, socket, _connect_info) do
    case Accounts.fetch_user_by_api_token(token) do
      {:ok, user} -> {:ok, assign(socket, :current_scope, Scope.for_user(user))}
      :error -> :error
    end
  end

  def connect(_params, _socket, _connect_info), do: :error

  @impl true
  def id(socket), do: "users_socket:#{socket.assigns.current_scope.user.id}"
end
