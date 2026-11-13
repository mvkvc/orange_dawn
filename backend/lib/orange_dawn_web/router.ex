defmodule OrangeDawnWeb.Router do
  use OrangeDawnWeb, :router

  import OrangeDawnWeb.UserAuth

  if Mix.env() == :dev do
    forward "/dev/mailbox", Plug.Swoosh.MailboxPreview
  end

  pipeline :api do
    plug :accepts, ["json"]
    plug :fetch_session
    plug :protect_from_forgery
    plug :fetch_current_scope_for_user
  end

  pipeline :authenticated_api do
    plug :require_authenticated_user
  end

  scope "/api/v1", OrangeDawnWeb do
    pipe_through :api
    get "/session", UserSessionController, :show
    post "/users", UserRegistrationController, :create
    post "/session", UserSessionController, :create
  end

  scope "/api/v1", OrangeDawnWeb do
    pipe_through [:api, :authenticated_api]
    delete "/session", UserSessionController, :delete
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
