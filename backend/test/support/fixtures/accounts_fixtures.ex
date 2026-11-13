defmodule OrangeDawn.AccountsFixtures do
  @moduledoc "Account fixtures for authentication tests."
  def valid_user_password, do: "hello world password!"

  def user_fixture(attrs \\ %{}) do
    {:ok, user} =
      attrs
      |> Enum.into(%{
        email: "user#{System.unique_integer([:positive])}@example.com",
        password: valid_user_password()
      })
      |> OrangeDawn.Accounts.register_user()

    user
  end
end
