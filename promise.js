const PENDING = 0
const FULFILLED = 1
const REJECTED = 2

const curry = (func, arg1) => (arg2) => func(arg1, arg2)

const isFunction = (obj) =>  'function' === typeof obj

const isIterable = (obj) => obj && typeof iterable.length === 'number'

const isThenable = (obj) => obj && typeof obj['then'] === 'function'

const setImmediate = (func) => setTimeout(func, 0)

const getThen = (value) => {
    var type = typeof value;
    var then;
    if (value && (type === 'object' || type === 'function')) {
        then = value.then;
        if (typeof then === 'function') {
            return then;
        }
    }
    return null;
}

const handle = (promise, handler) => {
    //console.log('handler:', handler)
    console.log('value:', promise._value)
    const state = promise._state
    const value = promise._value
    const handlers = promise._handlers
    
    switch (state) {
        case PENDING:
            handlers ? handlers.push(handler): (promise._handlers = [handler])
            return
        case FULFILLED:
            isFunction(handler.onFulfilled) && handler.onFulfilled(value)
            return
        case REJECTED:
            isFunction(handler.onRejected) && handler.onRejected(value)
            return
    }
}

const resolve = (promise, result) => {
    console.log("result:", result)
    console.log("promise:", promise)
    try {
        const then = getThen(result)
        if(then) {
            doResolve(
                (...args) => then.apply(result, ...args), 
                curry(resolve, promise), 
                curry(reject, promise))
            return
        }
        fulfill(promise, result)
    } catch (error) {
        reject(promise, error)
    }
}

const fulfill = (promise, result) => {
    //console.log('fulfill', result)
    promise._state = FULFILLED
    promise._value = result
    finale(promise)
}

const reject = (promise, reason) => {
    promise._state = REJECTED
    promise._value = reason
    finale(promise)
}

const finale = (promise) => {
    if (promise._handlers != null) {
        promise._handlers.forEach(curry(handle, promise))
        promise._handlers = null
    }
}



function doResolve(fn, onFulfilled, onRejected) {
    var done = false;
    try {
        fn((value) => {
            if (done) {
                return;
            }
            done = true;
            setImmediate(() => onFulfilled(value))
        }, (reason) => {
            if (done) {
                return;
            }
            done = true;
            setImmediate(() => onRejected(reason))
        });
    } catch (e) {
        if (done) {
            return;
        }
        done = true;
        setImmediate(() => onRejected(e))
    }
}



class Promise {
    constructor(handler) {
        if (!isFunction(handler))
	        throw new TypeError(`Promise resolver ${handler} is not a function`);

        this._state = PENDING
        this._handlers = []
        this._value = null
        this.time = +new Date
        
        doResolve(handler, curry(resolve, this), curry(reject, this))
    }


    then(onFulfilled, onRejected) {
	    // 每次返回一个promise，保证是可thenable的
        let res = null, self = this;
        const nextPromise = new Promise((resolve, reject) => {
            const _onFulfilled = (result) => {
                if (isFunction(onFulfilled)) {
                    try {
                        res = onFulfilled(result);
                        if (res === nextPromise) {
                            return reject(new TypeError('The `promise` and `x` refer to the same object.'));
                        }
                        return resolve(res);
                    } catch (e) {
                        return reject(e);
                    }
                } else {
                    return resolve(result);
                }
            }
            const _onRejected = (error) => {
                if (isFunction(onRejected)) {
                    try {
                        res = onRejected(error);
                        if (res === nextPromise) {
                            return reject(new TypeError('The `promise` and `x` refer to the same object.'));
                        }
                        return resolve(res);
                    } catch (ex) {
                        return reject(ex);
                    }
                } else {
                    return reject(error);
                }
            }
            setImmediate(() => handle(this, {onFulfilled: _onFulfilled, onRejected: _onRejected}))
        });
        return nextPromise;
    }

    catch(onRejected) {
	    return this.then(undefined, onRejected)
    }

    delay(ms, val) {
        return this.then((ori) => Promise.delay(ms, val || ori))
    }

    finally(f) {
        return this.then(
                (value) => Promise.resolve(f()).then(()=>value), 
                (reason)=>Promise.reject(f()).then(()=>{throw reason}))
    }

    static all(promises){
        if (!isIterable(promises)) {
            throw new TypeError('ArgumentsError: argument should be iterable.')
        }
        const len = promises.length
        return len === 0 ? Promise.resolve([]) : new Promise(function(resolve, reject) {
            const results = new Array(len)
            let resolved = 0

            for (let i = 0; i < len; i++) {
                (function(i) {
                    promise = promises[i]
                    if (!(promise instanceof Promise)) {
                        promise = Promise.resolve(promise)
                    }
                    promise.catch(function(reason) {
                        reject(reason)
                    });
                    promise.then(function(value) {
                        results[i] = value
                        if (++resolved === len) {
                            resolve(results)
                        }
                    })
                })(i)
            }
        })
    }

    static race(promises) {
        if (!isIterable(promises)) {
            throw new TypeError('ArgumentsError: argument should be iterable.')
        }
        const deferred = Promise.deferred()
        const len = promises.length
        for (let i = 0; i < len; i++) {
            promise = promises[i];
            if (promise instanceof Promise) {
                promise.then(function(value) {
                    deferred.resolve(value);
                }, function(reason) {
                    deferred.reject(reason);
                });
            } else {
                // if not promise, immediately resolve result promise
                deferred.resolve(promise);
                break;
            }
        }
        return deferred.promise
    }

    static deferred() {
        const deferred = {}
        deferred.promise = new Promise((resolve,reject) => {
            deferred.resolve = resolve
            deferred.reject = reject
        });
        return deferred
    }

    static resolve(data) {
        return new Promise((resolve) => resolve(data))
    }


    static reject(reason) {
        return new Promise((resolve, reject) => reject(reason))
    }

    static delay(ms, ...args){
        return new Promise((resolve, reject) => setTimeout(() => resolve(...args), ms))
    }
}


var a = new Promise(function(resolve, reject) {
    setTimeout(function() {
        resolve('hello1')
    }, 1000);
}).then(function(value) {
    console.log(value)
    return new Promise(function(resolve, reject) {
        setTimeout(function() {
            console.log(value)
            resolve('hello2')
        }, 2000);
    })
})

const b = (value)=> {
    console.log('ssss', a)
    console.log("111",value)
}
console.log("jjsjsj",a.then(b))

module.exports = Promise