defmodule OrangeDawnWeb.SpaController do
  use OrangeDawnWeb, :controller

  # The file path is fixed under the application directory, never request input.
  # sobelow_skip ["Traversal.SendFile"]
  def index(conn, _params) do
    if String.starts_with?(conn.request_path, "/api") do
      conn
      |> put_status(:not_found)
      |> json(%{errors: %{detail: "Not Found"}})
    else
      conn
      |> put_resp_content_type("text/html")
      |> send_file(200, Application.app_dir(:orange_dawn, "priv/static/index.html"))
    end
  end
end
