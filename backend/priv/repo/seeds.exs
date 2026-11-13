# Run with: mix run priv/repo/seeds.exs
# Development accounts use the normal email-link login flow.
alias OrangeDawn.Accounts

if Mix.env() == :dev && is_nil(Accounts.get_user_by_email("test@test.com")) do
  {:ok, _user} = Accounts.register_user(%{email: "test@test.com"})
end
