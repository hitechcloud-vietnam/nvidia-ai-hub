module.exports = async function notarizeIfConfigured(context) {
  const { electronPlatformName, appOutDir, packager } = context

  if (electronPlatformName !== 'darwin') {
    return
  }

  const appleId = process.env.APPLE_ID
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD
  const teamId = process.env.APPLE_TEAM_ID

  if (!appleId || !appleIdPassword || !teamId) {
    console.log('Skipping macOS notarization because APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, or APPLE_TEAM_ID is not configured.')
    return
  }

  const { notarize } = require('@electron/notarize')
  const appName = packager.appInfo.productFilename

  await notarize({
    appPath: `${appOutDir}/${appName}.app`,
    appleId,
    appleIdPassword,
    teamId,
  })
}
