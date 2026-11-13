defmodule OrangeDawnWeb.UserSessionControllerTest do
  use OrangeDawnWeb.ConnCase, async: true
  alias OrangeDawn.Accounts
  alias OrangeDawn.Accounts.UserToken
  alias OrangeDawn.Repo
  import OrangeDawn.AccountsFixtures

  defp csrf_conn do
    response = get(build_conn(), ~p"/api/v1/session")
    token = json_response(response, 200)["csrf_token"]

    response
    |> recycle()
    |> put_private(:plug_skip_csrf_protection, false)
    |> put_req_header("x-csrf-token", token)
  end

  test "cookie login, browser return through remember-me, and logout" do
    user = user_fixture()
    {link, record} = UserToken.build_email_token(user, "login")
    Repo.insert!(record)
    response = post(csrf_conn(), ~p"/api/v1/session", user: %{token: link})
    body = json_response(response, 200)
    assert body["user"]["id"] == user.id
    refute Map.has_key?(body, "token")
    cookie = response.resp_cookies["_orange_dawn_user_remember_me"]
    assert cookie.http_only
    assert cookie.max_age == 14 * 86_400
    session_token = get_session(response, :user_token)

    # Simulate a new browser session retaining only the persistent cookie.
    returned =
      build_conn()
      |> put_req_cookie("_orange_dawn_user_remember_me", cookie.value)
      |> get(~p"/api/v1/session")

    assert json_response(returned, 200)["user"]["id"] == user.id
    assert get_session(returned, :user_token) == session_token
    csrf = json_response(returned, 200)["csrf_token"]

    logged_out =
      returned |> recycle() |> put_req_header("x-csrf-token", csrf) |> delete(~p"/api/v1/session")

    assert response(logged_out, 204) == ""
    assert logged_out.resp_cookies["_orange_dawn_user_remember_me"].max_age == 0
    refute Accounts.get_user_by_session_token(session_token)

    replay =
      build_conn()
      |> put_req_cookie("_orange_dawn_user_remember_me", cookie.value)
      |> get(~p"/api/v1/session")

    assert json_response(replay, 200)["user"] == nil
  end

  test "unsafe requests require CSRF protection" do
    assert_raise Plug.CSRFProtection.InvalidCSRFTokenError, fn ->
      post(put_private(build_conn(), :plug_skip_csrf_protection, false), ~p"/api/v1/session",
        user: %{email: "test@example.com"}
      )
    end
  end

  test "registration emails a link and invalid links fail" do
    response = post(csrf_conn(), ~p"/api/v1/users", user: %{email: "new@example.com"})
    assert json_response(response, 201)["message"]
    assert_receive {:email, _}
    assert json_response(post(csrf_conn(), ~p"/api/v1/session", user: %{token: "invalid"}), 401)
  end
end
