# frozen_string_literal: true

require "json"

pr = JSON.parse(File.read(ENV.fetch("GITHUB_EVENT_PATH"))).fetch("pull_request")
titles = { "PR title" => pr.fetch("title") }
git.commits.each { |commit| titles["Commit #{commit.sha[0, 7]}"] = commit.message.chomp }

titles.each do |label, title|
  valid = title.match?(/\A(feat|fix|docs|refactor|test|chore|build)(\([a-z0-9][a-z0-9._\/-]*\))?!?: \S[^\r\n]*\z/)
  failure "#{label}: use a Conventional Commit title, max 72 characters, no body." unless valid && title.length <= 72 && title == title.strip
end
