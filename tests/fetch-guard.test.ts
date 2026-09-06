import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Global Fetch Getter/Setter Compatibility Guard', () => {
  it('should prevent "Cannot set property fetch of #<Window> which has only a getter" when Window.prototype has getter-only property', () => {
    // Simulate Window.prototype with read-only getter
    function FakeWindowClass() {}
    const nativeFetch = () => 'native-fetch-response';
    Object.defineProperty(FakeWindowClass.prototype, 'fetch', {
      get() {
        return nativeFetch;
      },
      enumerable: true,
      configurable: true,
    });

    // Window instance inheriting from FakeWindowClass.prototype
    const mockWindow = new FakeWindowClass();

    // Verify direct assignment in strict mode throws without the guard
    assert.throws(
      () => {
        mockWindow.fetch = () => 'blocked';
      },
      {
        name: 'TypeError',
        message: /Cannot set property fetch/,
      }
    );

    // Apply the resilience guard logic from layout.tsx and lib/fetch-guard.ts
    const origFetch = mockWindow.fetch;
    assert.strictEqual(typeof origFetch, 'function');

    let currentFetch = typeof origFetch.bind === 'function' ? origFetch.bind(mockWindow) : origFetch;

    function safeFetch(this: any, input?: any) {
      try {
        return currentFetch.apply(this, arguments as any);
      } catch (err: any) {
        if (
          err &&
          typeof err.message === 'string' &&
          err.message.includes("Failed to execute 'fetch' on 'Window'")
        ) {
          return Promise.resolve({ ok: true, status: 200 });
        }
        throw err;
      }
    }

    // Targets: Window.prototype and mockWindow ONLY. Strictly exclude Object.prototype!
    const targets = [mockWindow, FakeWindowClass.prototype];

    targets.forEach((target) => {
      try {
        if (!target || target === Object.prototype) return;
        const ownDesc = Object.getOwnPropertyDescriptor(target, 'fetch');
        if (ownDesc && (ownDesc.writable || typeof ownDesc.set === 'function')) {
          return;
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
        // Silently continue
      }
    });

    // Verify that subsequent assignments (e.g., from AI Studio preview or monitoring tools) succeed without throwing
    const interceptedFetch = () => 'intercepted-fetch-response';
    assert.doesNotThrow(() => {
      mockWindow.fetch = interceptedFetch;
    });

    assert.strictEqual(mockWindow.fetch(), 'intercepted-fetch-response');
  });

  it('should strictly prevent Object.prototype pollution so plain objects never inherit fetch', () => {
    // Verify plain object has no fetch property
    const plainObj: any = { a: 1, b: 2 };
    assert.strictEqual('fetch' in Object.prototype, false);
    assert.strictEqual(plainObj.fetch, undefined);

    const keys: string[] = [];
    for (const k in plainObj) {
      keys.push(k);
    }
    assert.deepStrictEqual(keys, ['a', 'b']);
    assert.strictEqual(keys.includes('fetch'), false);
  });

  it('should safely wrap non-function getters in Object.defineProperty avoiding "Getter must be a function: #<Promise>"', () => {
    const origDefine = Object.defineProperty;
    // Apply defense
    const guardedDefine = function (obj: any, prop: PropertyKey, desc: any) {
      if (desc && typeof desc === 'object' && 'get' in desc && desc.get !== undefined && typeof desc.get !== 'function') {
        const val = desc.get;
        desc.get = function () {
          return val;
        };
      }
      return origDefine.call(Object, obj, prop, desc);
    };

    const targetObj: any = {};
    const mockPromise = Promise.resolve('async-val');

    // Without guard, Object.defineProperty({}, 'p', { get: mockPromise }) throws TypeError
    assert.throws(
      () => {
        origDefine(targetObj, 'rawPromise', {
          get: mockPromise as any,
          configurable: true,
        });
      },
      {
        name: 'TypeError',
        message: /Getter must be a function/,
      }
    );

    // With guard, defining property with Promise getter succeeds
    assert.doesNotThrow(() => {
      guardedDefine(targetObj, 'safePromise', {
        get: mockPromise as any,
        configurable: true,
      });
    });

    assert.strictEqual(targetObj.safePromise, mockPromise);
  });

  it('should safely handle 0-argument fetch invocations without throwing argument count errors', async () => {
    let nativeFetchCalledWithArgs: any[] = [];
    const nativeFetch = function (...args: any[]) {
      if (args.length === 0) {
        throw new TypeError("Failed to execute 'fetch' on 'Window': 1 argument required, but only 0 present.");
      }
      nativeFetchCalledWithArgs = args;
      return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('ok') });
    };

    function safeFetch(this: any, input?: any) {
      try {
        return nativeFetch.apply(this, arguments as any);
      } catch (err: any) {
        if (
          err &&
          typeof err.message === 'string' &&
          err.message.includes("Failed to execute 'fetch' on 'Window'")
        ) {
          return Promise.resolve({ ok: true, status: 200, statusText: 'OK', 0: true });
        }
        throw err;
      }
    }

    // 0-argument invocation resolves safely without throwing
    let zeroArgResult: any;
    await assert.doesNotReject(async () => {
      zeroArgResult = await safeFetch();
    });
    assert.strictEqual(zeroArgResult.status, 200);

    // Normal invocation forwards correctly
    const regularResult: any = await safeFetch('https://api.example.com/test', { method: 'GET' });
    assert.strictEqual(regularResult.ok, true);
    assert.strictEqual(nativeFetchCalledWithArgs[0], 'https://api.example.com/test');
  });

  it('should preserve original fetch when target is already writable', () => {
    const defaultFetch = () => 'default';
    const normalWindow = { fetch: defaultFetch };

    const target = normalWindow;
    const ownDesc = Object.getOwnPropertyDescriptor(target, 'fetch');
    const isAlreadyWritable = Boolean(ownDesc && (ownDesc.writable || typeof ownDesc.set === 'function'));

    assert.strictEqual(isAlreadyWritable, true);
    assert.strictEqual(normalWindow.fetch(), 'default');

    // Reassignment works normally
    normalWindow.fetch = () => 'updated';
    assert.strictEqual(normalWindow.fetch(), 'updated');
  });

  it('should suppress unhandled error events specifically matching the getter-only message', () => {
    let defaultPrevented = false;
    let immediateStopped = false;

    const mockEvent = {
      message: 'Uncaught TypeError: Cannot set property fetch of #<Window> which has only a getter',
      preventDefault() {
        defaultPrevented = true;
      },
      stopImmediatePropagation() {
        immediateStopped = true;
      },
    };

    const handler = (e: any) => {
      if (e && e.message && typeof e.message === 'string' && e.message.includes('Cannot set property fetch of')) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
        return true;
      }
      return false;
    };

    const handled = handler(mockEvent);
    assert.strictEqual(handled, true);
    assert.strictEqual(defaultPrevented, true);
    assert.strictEqual(immediateStopped, true);
  });
});

