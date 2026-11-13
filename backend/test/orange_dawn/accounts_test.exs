defmodule OrangeDawn.AccountsTest do
  use OrangeDawn.DataCase, async: true
  alias OrangeDawn.Accounts
  alias OrangeDawn.Accounts.{User, UserToken}
  import OrangeDawn.AccountsFixtures

  test "registration requires email and magic links confirm once" do
    assert {:error, changeset} = Accounts.register_user(%{email: "bad"})
    assert %{email: _} = errors_on(changeset)
    user = user_fixture()
    assert is_nil(user.hashed_password)
    {token, record} = UserToken.build_email_token(user, "login")
    Repo.insert!(record)
    assert {:ok, {confirmed, _}} = Accounts.login_user_by_magic_link(token)
    assert confirmed.confirmed_at
    assert {:error, :not_found} = Accounts.login_user_by_magic_link(token)
  end

  test "magic links expire after fifteen minutes" do
    user = user_fixture()
    {token, record} = UserToken.build_email_token(user, "login")
    Repo.insert!(%{record | inserted_at: DateTime.add(DateTime.utc_now(:second), -16, :minute)})
    assert {:error, :not_found} = Accounts.login_user_by_magic_link(token)
  end

  test "API tokens are hashed, expire, and are individually revocable" do
    user = user_fixture()
    token = Accounts.create_user_api_token(user)
    other = Accounts.create_user_api_token(user)
    assert {:ok, ^user} = Accounts.fetch_user_by_api_token(token)
    {:ok, raw} = Base.url_decode64(token, padding: false)
    assert Repo.get_by!(UserToken, token: :crypto.hash(:sha256, raw)).context == "api-token"
    assert :error = Accounts.fetch_user_by_api_token("invalid")
    assert :error = Accounts.fetch_user_by_api_token(nil)
    Accounts.delete_user_api_token(token)
    assert :error = Accounts.fetch_user_by_api_token(token)
    assert {:ok, ^user} = Accounts.fetch_user_by_api_token(other)

    Repo.update_all(UserToken,
      set: [inserted_at: DateTime.add(DateTime.utc_now(:second), -8, :day)]
    )

    assert :error = Accounts.fetch_user_by_api_token(other)
  end

  test "tokens stop working after the account email changes" do
    user = user_fixture()
    token = Accounts.create_user_api_token(user)
    Repo.update_all(from(u in User, where: u.id == ^user.id), set: [email: "changed@example.com"])
    assert :error = Accounts.fetch_user_by_api_token(token)
  end
end
