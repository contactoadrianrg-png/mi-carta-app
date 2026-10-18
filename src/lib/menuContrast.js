function rgb(color) {
  return /^#[\da-f]{6}$/i.test(color ?? '') ? [1, 3, 5].map(index => parseInt(color.slice(index, index + 2), 16)) : [255, 107, 53]
}
function luminance(channels) {
  const linear = channels.map(channel => { const value = channel / 255; return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4 })
  return linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722
}
export function textOnAccent(color) {
  return luminance(rgb(color)) > .179 ? '#1a1a1a' : '#ffffff'
}
export function accentOnWhite(color) {
  let channels = rgb(color)
  while (luminance(channels) > .183) channels = channels.map(channel => Math.floor(channel * .9))
  return '#' + channels.map(channel => channel.toString(16).padStart(2, '0')).join('')
}
