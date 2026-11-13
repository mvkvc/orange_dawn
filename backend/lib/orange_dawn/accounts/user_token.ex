defmodule OrangeDawn.Accounts.UserToken do
  use Ecto.Schema
  import Ecto.Query
  alias OrangeDawn.Accounts.UserToken

  @hash_algorithm :sha256
  @rand_size 32

  @api_token_validity_in_days 7
  @magic_link_validity_in_minutes 15

  schema "users_tokens" do
    field :token, :binary
    field :context, :string
    field :sent_to, :string
    field :authenticated_at, :utc_datetime
    belongs_to :user, OrangeDawn.Accounts.User

    timestamps(type: :utc_datetime, updated_at: false)
  end

  def build_email_token(user, context) do
    build_hashed_token(user, context, user.email)
  end

  defp build_hashed_token(user, context, sent_to) do
    token = :crypto.strong_rand_bytes(@rand_size)
    hashed_token = :crypto.hash(@hash_algorithm, token)

    {Base.url_encode64(token, padding: false),
     %UserToken{
       token: hashed_token,
       context: context,
       sent_to: sent_to,
       user_id: user.id
     }}
  end

  @doc "Verifies a hashed API token, its age, and its associated email."
  def verify_api_token_query(token) when is_binary(token) do
    with {:ok, decoded} <- Base.url_decode64(token, padding: false),
         true <- byte_size(decoded) == @rand_size do
      hashed = :crypto.hash(@hash_algorithm, decoded)

      {:ok,
       from(t in UserToken,
         join: user in assoc(t, :user),
         where: t.token == ^hashed and t.context == "api-token",
         where: t.inserted_at > ago(@api_token_validity_in_days, "day"),
         where: t.sent_to == user.email,
         select: user
       )}
    else
      _ -> :error
    end
  end

  def verify_api_token_query(_), do: :error

  def verify_magic_link_token_query(token) do
    case Base.url_decode64(token, padding: false) do
      {:ok, decoded_token} ->
        hashed_token = :crypto.hash(@hash_algorithm, decoded_token)

        query =
          from token in by_token_and_context_query(hashed_token, "login"),
            join: user in assoc(token, :user),
            where: token.inserted_at > ago(^@magic_link_validity_in_minutes, "minute"),
            where: token.sent_to == user.email,
            select: {user, token}

        {:ok, query}

      :error ->
        :error
    end
  end

  defp by_token_and_context_query(token, context) do
    from UserToken, where: [token: ^token, context: ^context]
  end
end
