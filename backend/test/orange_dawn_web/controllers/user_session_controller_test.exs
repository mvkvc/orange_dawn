defmodule OrangeDawnWeb.UserSessionControllerTest do
  use OrangeDawnWeb.ConnCase, async: true
  alias OrangeDawn.Accounts
  import OrangeDawn.AccountsFixtures

  test "register, restore and revoke a bearer session", %{conn: conn} do
    response =
      post(conn, ~p"/api/v1/users",
        user: %{email: "new@example.com", password: valid_user_password()}
      )

    assert %{"message" => _} = json_response(response, 201)
    assert_receive {:email, email}
    [_, link] = String.split(email.text_body, "/users/log-in#login=")
    token = link |> String.split() |> hd()
    response = post(conn, ~p"/api/v1/session", user: %{token: token})
    assert %{"token" => token, "user" => user} = json_response(response, 200)

    assert Map.keys(user) == ["email", "id"]
    assert get_resp_header(response, "cache-control") == ["no-store"]
    authenticated = conn |> put_req_header("authorization", "Bearer #{token}")
    assert json_response(get(authenticated, ~p"/api/v1/session"), 200)["user"] == user
    OrangeDawnWeb.Endpoint.subscribe("users_socket:#{user["id"]}")
    assert response(delete(authenticated, ~p"/api/v1/session"), 204) == ""
    assert json_response(get(authenticated, ~p"/api/v1/session"), 401)
    assert_receive %Phoenix.Socket.Broadcast{event: "disconnect"}
    assert :error = Accounts.fetch_user_by_api_token(token)
  end

  test "login requests email and rejects invalid links", %{conn: conn} do
    user = user_fixture()

    assert %{"message" => _} =
             json_response(post(conn, ~p"/api/v1/session", user: %{email: user.email}), 200)

    assert_receive {:email, _}
    assert json_response(post(conn, ~p"/api/v1/session", user: %{token: "invalid"}), 401)
  end

  test "registration and protected routes return JSON errors", %{conn: conn} do
    for params <- [%{}, %{user: []}, %{user: %{email: "bad", password: "short"}}] do
      assert %{"errors" => _} = json_response(post(conn, ~p"/api/v1/users", params), 422)
    end

    for header <- [nil, "Bearer invalid", "Basic abc"] do
      conn = if header, do: put_req_header(conn, "authorization", header), else: conn
      assert json_response(get(conn, ~p"/api/v1/session"), 401)
    end
  end
end
