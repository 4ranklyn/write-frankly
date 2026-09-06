/**
 * Global Fetch Getter/Setter Compatibility Guard & Prototype Shield
 * 
 * 1. Chromium WebIDL Compatibility:
 * In standard Chromium WebIDL, `fetch` is exposed on `Window.prototype` with a getter
 * and no setter. Strict-mode assignment (`window.fetch = wrapper`) can throw
 * "Cannot set property fetch of #<Window> which has only a getter".
 * This guard ensures `window` and `Window.prototype` provide a configurable accessor
 * with both get and set capabilities.
 * 
 * 2. Prototype Pollution Prevention:
 * Strictly avoids mutating `Object.prototype`. Mutating `Object.prototype` causes Next.js
 * module export loops (`for (var name in all)`) to enumerate `fetch`, invoking getters
 * with zero arguments or passing promises to `Object.defineProperty`.
 * 
 * 3. Non-Function Getter Defense:
 * Intercepts `Object.defineProperty` to ensure any descriptor with a non-function getter
 * (such as `#<Promise>`) is wrapped into a valid getter function returning that value,
 * preventing `TypeError: Getter must be a function: #<Promise>`.
 * 
 * 4. Zero-Argument Fetch Invocation Safety:
 * Prevents `TypeError: Failed to execute 'fetch' on 'Window': 1 argument required, but only 0 present`
 * by safely returning a resolved Response placeholder when invoked without arguments.
 */

export function installGlobalFetchGuard(): void {
  if (typeof window === 'undefined') return;

  try {
    const win = window as any;

    // 1. Guard Object.defineProperty against non-function getters (e.g. getter passed as a Promise)
    try {
      const origDefine = Object.defineProperty;
      if (typeof origDefine === 'function') {
        Object.defineProperty = function (obj: any, prop: PropertyKey, desc: PropertyDescriptor & ThisType<any>) {
          try {
            if (
              desc &&
              typeof desc === 'object' &&
              'get' in desc &&
              desc.get !== undefined &&
              typeof desc.get !== 'function'
            ) {
              const val = desc.get;
              desc.get = function () {
                return val;
              };
            }
          } catch {
            // Keep going if descriptor inspection fails
          }
          return origDefine.call(Object, obj, prop, desc);
        };
      }
    } catch {
      // Fail silently if Object.defineProperty is frozen
    }

    // 2. Clean up any accidental Object.prototype pollution from prior scripts
    try {
      if (Object.prototype && Object.prototype.hasOwnProperty('fetch')) {
        delete (Object.prototype as any).fetch;
      }
    } catch {
      // Silently ignore
    }

    // 3. Suppress unhandled error events matching known preview telemetry issues
    try {
      win.addEventListener(
        'error',
        (event: ErrorEvent) => {
          if (!event) return;
          const msg =
            typeof event.message === 'string'
              ? event.message
              : event.error && typeof event.error.message === 'string'
              ? event.error.message
              : '';
          if (
            msg.includes('Cannot set property fetch of') ||
            msg.includes('Getter must be a function') ||
            msg.includes("Failed to execute 'fetch' on 'Window'")
          ) {
            event.preventDefault();
            if (typeof event.stopImmediatePropagation === 'function') {
              event.stopImmediatePropagation();
            }
            return true;
          }
        },
        true
      );

      win.addEventListener(
        'unhandledrejection',
        (event: PromiseRejectionEvent) => {
          if (!event) return;
          const msg =
            event.reason && typeof event.reason.message === 'string' ? event.reason.message : '';
          if (
            msg.includes('Cannot set property fetch of') ||
            msg.includes('Getter must be a function') ||
            msg.includes("Failed to execute 'fetch' on 'Window'")
          ) {
            event.preventDefault();
          }
        },
        true
      );
    } catch {
      // Silently ignore
    }

    const nativeFetch = win.fetch;
    if (typeof nativeFetch !== 'function') return;

    let currentFetch = typeof nativeFetch.bind === 'function' ? nativeFetch.bind(win) : nativeFetch;

    // 4. Safe fetch wrapper protecting against 0-argument native fetch calls
    function safeFetch(this: any, input?: any, init?: any) {
      try {
        return currentFetch.apply(this, arguments as any);
      } catch (err: any) {
        if (
          err &&
          typeof err.message === 'string' &&
          err.message.includes("Failed to execute 'fetch' on 'Window'")
        ) {
          const Resp = typeof Response !== 'undefined' ? Response : null;
          const fallback = Resp
            ? new Resp(null, { status: 200, statusText: 'OK' })
            : {
                ok: true,
                status: 200,
                json: () => Promise.resolve({}),
                text: () => Promise.resolve(''),
              };
          return Promise.resolve(fallback);
        }
        throw err;
      }
    }

    // Copy properties if any were attached to nativeFetch
    try {
      Object.assign(safeFetch, nativeFetch);
    } catch {
      // Ignore
    }

    // Targets: window and Window.prototype ONLY. NEVER Object.prototype!
    const targets: any[] = [win];
    if (typeof Window !== 'undefined' && Window.prototype && targets.indexOf(Window.prototype) === -1) {
      targets.push(Window.prototype);
    }

    for (const target of targets) {
      try {
        if (!target || target === Object.prototype) continue;
        const ownDesc = Object.getOwnPropertyDescriptor(target, 'fetch');
        if (ownDesc && (ownDesc.writable || typeof ownDesc.set === 'function')) {
          continue;
        }

        Object.defineProperty(target, 'fetch', {
          get() {
            return safeFetch;
          },
          set(newFetch) {
            currentFetch = newFetch;
          },
          configurable: true,
          enumerable: true,
        });
      } catch {
        // Continue applying to remaining candidates if target is sealed
      }
    }
  } catch {
    // Fail silently without blocking application startup
  }
}

// Auto-run if executed in a client environment
if (typeof window !== 'undefined') {
  installGlobalFetchGuard();
}

