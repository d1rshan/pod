import { contextBridge } from 'electron'

// TODO: expose a minimal, typed API to the injected UI.
contextBridge.exposeInMainWorld('pod', {})
