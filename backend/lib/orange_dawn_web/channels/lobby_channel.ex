defmodule OrangeDawnWeb.LobbyChannel do
  @moduledoc "Accepts connections to lobby topics."

  use OrangeDawnWeb, :channel

  @impl true
  def join("lobby:" <> _lobby_id, _payload, socket) do
    {:ok, socket}
  end
end
