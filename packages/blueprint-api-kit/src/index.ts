// Ambient module augmentations for the axios request config and the React Query
// meta keys this package reads. Imported for its types; it emits no runtime code.
import './augmentations'

export type { BlueprintAxiosOptions } from './options'

export { showErrorNotification } from './show-error-notification'

export type { BlueprintQueryClientOptions } from './create-query-client'
export { createBlueprintQueryClient } from './create-query-client'

export { configureGlobalAxios } from './configure-global-axios'

export type { OrvalAxiosClient } from './create-orval-axios-client'
export { createOrvalAxiosClient } from './create-orval-axios-client'

export type {
  OrvalQueryClient,
  OrvalQueryClientOptions,
} from './create-orval-query-client'
export { createOrvalQueryClient } from './create-orval-query-client'
