defmodule OrangeDawnWeb.UserSocketTest do
  use OrangeDawn.DataCase, async: true
  alias OrangeDawn.Accounts
  alias OrangeDawnWeb.UserSocket
  import OrangeDawn.AccountsFixtures

  test "socket requires a valid API token and assigns the authenticated scope" do
    user = user_fixture()
    token = Accounts.create_user_api_token(user)
    assert {:ok, socket} = UserSocket.connect(%{"token" => token}, %Phoenix.Socket{}, %{})
    assert socket.assigns.current_scope.user.id == user.id
    assert UserSocket.id(socket) == "users_socket:#{user.id}"
    assert :error = UserSocket.connect(%{}, %Phoenix.Socket{}, %{})
    Accounts.delete_user_api_token(token)
    assert :error = UserSocket.connect(%{"token" => token}, %Phoenix.Socket{}, %{})
  end
end
