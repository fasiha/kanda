# using git worktrees http://blog.jenkster.com/2016/02/git-for-static-sites.html

rm build && npx snowpack build && cp -pr build/* ../curtiz-annotate-sidecar-web-gh-pages

