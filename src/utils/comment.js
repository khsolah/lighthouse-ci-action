const core = require('@actions/core')
const { getOctokit, context } = require('@actions/github')
const { getManifest } = require('./lhci-helpers')

/**
 *
 * @param {number} score
 * @returns string
 */
function formatScore(score) {
  return Math.round(score * 100)
}

/**
 *
 * @param {number} score
 * @returns string
 */
function emojiScore(score) {
  return score >= 0.9 ? '🟢' : score >= 0.5 ? '🟠' : '🔴'
}

/**
 *
 * @param {string} label
 * @param {number} score
 * @returns string
 */
function scoreRow(label, score) {
  return `| ${emojiScore(score)} ${label} | ${formatScore(score)} |`
}

/**
 * set comment on pull request
 * @param {{resultsPath:string;githubToken:string;}} params
 * @return {Promise<number>}
 */
exports.createComment = async function createComment({ githubToken, resultsPath }) {
  const manifestResults = await getManifest(resultsPath)
  const body =
    manifestResults
      ?.reduce(
        (summaryArr, item) => {
          summaryArr.push(`

### ${item.url.replace(/http(s?):\/\/localhost:\d*/, '')}

| Category | Score |
| -------- | ----- |
${scoreRow('Performance', item.summary.performance)}
${scoreRow('Accessibility', item.summary.accessibility)}
${scoreRow('Best practices', item.summary['best-practices'])}
${scoreRow('SEO', item.summary.seo)}
${scoreRow('PWA', item.summary.pwa)}

    `)
          return summaryArr
        },
        ['## ⚡️🏠 Lighthouse report']
      )
      .join('') ?? ''

  return await getOctokit(githubToken).rest.issues.createComment({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: context.issue.number,
    body,
  })
    .then(() => 0)
    .catch(error => {
      core.setFailed(`Create comment failed: ${error}`)
      return -1
    })
}
