import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat.js'

// Without this plugin dayjs ignores a parse format and hands the input to `new Date()`. It is
// loaded here rather than left to the app, so typed dates parse the same whatever the app's
// start-up code does. Mantine's date inputs parse through the same dayjs instance.
dayjs.extend(customParseFormat)

export default dayjs
