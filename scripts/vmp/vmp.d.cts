export type VmpHook = 'afterPack' | 'afterSign'
export function vmpHook(platform: string): VmpHook | null
export function vmpSign(hook: VmpHook, context: { electronPlatformName: string; appOutDir: string }): void
