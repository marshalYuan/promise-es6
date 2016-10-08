const PENDING = undefined
const FULFILLED = 1
const REJECTED = 2

const isFunction = (obj) =>  'function' === typeof obj

const isArray = (obj) => Object.prototype.toString.call(obj) === "[object Array]"

const isThenable = (obj) => obj && typeof obj['then'] == 'function'

function transition(status,value){
	let promise = this
	if(promise._status !== PENDING) return;
	// 所以的执行都是异步调用，保证then是先执行的
	setTimeout(() => {
		promise._status = status
		publish.call(promise,value)
	}, 0)
}

function publish(val) {
	var promise = this,
    	fn,
    	st = promise._status === FULFILLED,
    	queue = promise[st ? '_resolves' : '_rejects'];
        
    while(fn = queue.shift()) {
        val = fn.call(promise, val) || val;
    }
    promise[st ? '_value' : '_reason'] = val;
    promise['_resolves'] = promise['_rejects'] = undefined;
}


class Promise {
    constructor(handler) {
        if (!isFunction(handler))
	        throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');

        if(!(this instanceof Promise)) return new Promise(handler);

        var promise = this;
        this._value;
        this._reason;
        this._status = PENDING;
        this._resolves = [];
        this._rejects = [];
                
        handler((value) => transition.apply(this, [FULFILLED].concat([value]))
            , (reason) => transition.apply(this, [REJECTED].concat([reason])))
    }

    static all(promises){
        if (!isArray(promises)) {
            throw new TypeError('You must pass an array to all.');
        }
        return Promise(function(resolve,reject){
            var i = 0,
                result = [],
                len = promises.length,
                count = len

            function resolver(index) {
                return function(value) {
                    resolveAll(index, value);
                };
            }

            function rejecter(reason){
                reject(reason);
            }

            function resolveAll(index,value){
                result[index] = value;
                if( --count == 0){
                    resolve(result)
                }
            }

            for (; i < len; i++) {
                promises[i].then(resolver(i),rejecter);
            }
        });
    }

    race(promises) {
        if (!isArray(promises)) {
            throw new TypeError('You must pass an array to race.');
        }
        return Promise(function(resolve,reject){
            var i = 0,
                len = promises.length;

            function resolver(value) {
                resolve(value);
            }

            function rejecter(reason){
                reject(reason);
            }

            for (; i < len; i++) {
                promises[i].then(resolver,rejecter);
            }
        });
    }

    static deferred() {
        var defereded = {}
        var promise = new Promise(function(resolve,reject){
            deferred.resolve = resolve;
            deferred.reject = reject;
        });
        return defereded;
    }

    static resolve(data) {
        return new Promise((resolve)=>resolve(data))
    }


    static reject(reason) {
        return new Promise((resolve, reject)=>reject(reason))
    }

    static delay(ms, val){
        return Promise((resolve,reject) => setTimeout((val) => resolve(val), ms))
    }

    then(resolveHandler, rejectHandler) {
	    // 每次返回一个promise，保证是可thenable的
        return new Promise((resolve, reject) => {
            const callback = (value) => {
                const ret = isFunction(resolveHandler) && resolveHandler(value) || value;
                if(isThenable(ret)){
                    ret.then(function(value){
                        resolve(value);
                    },function(reason){
                        reject(reason);
                    });
                }else{
                    resolve(ret);
                }
            }

            const errback = (reason) =>{
                reason = isFunction(onRejected) && onRejected(reason) || reason;
                reject(reason);
            }
            console.log(this)
            if(this._status === PENDING){
                this._resolves.push(callback);
                this._rejects.push(errback);
            }else if(this._status === FULFILLED){ // 状态改变后的then操作，立刻执行
                callback(this._value);
            }else if(this._status === REJECTED){
                errback(this._reason);
            }
        });
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
}

module.exports = Promise

new Promise((resolve, reject) => setTimeout(() => resolve(10), 2000)).then((value)=>console.log(value))