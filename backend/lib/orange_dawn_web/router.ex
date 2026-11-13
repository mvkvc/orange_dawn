defmodule OrangeDawnWeb.Router do
  use OrangeDawnWeb, :router

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/api/v1", OrangeDawnWeb do
    pipe_through :api
  end

  if Application.compile_env(:orange_dawn, :serve_spa, false) do
    scope "/", OrangeDawnWeb do
      get "/", SpaController, :index
      get "/*path", SpaController, :index
    end
  end

  scope "/", OrangeDawnWeb do
    pipe_through :api

    match :*, "/", FallbackController, :not_found
    match :*, "/*path", FallbackController, :not_found
  end
end
