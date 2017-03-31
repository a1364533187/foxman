import {initialsLower, log, notify, entries, error, isPromise, isGeneratorDone} from '../helper/util';
import {init} from './Instance';
import {register, resolve, dependencys} from './DI';


function* execute() {
    for (let [, plugin] of entries(dependencys)) {
        if (plugin.init && plugin.enable) {
            resolve(plugin.init, plugin);

            if (plugin.pendings) {
                notify({
                    title: `Plugin start pending`,
                    msg: `${plugin.name} start pending`
                });

                yield Promise.all(plugin.pendings);

                notify({
                    title: `Plugin end pending`,
                    msg: `${plugin.name} end pending`
                });
            }
        }
    }
}

function runGenerators(generator) {
    let final, resolve, reject;

    const generatorIterator = () => {
        final = generator.next();

        if (isGeneratorDone(final)) {
            return resolve();
        }

        if (isPromise(final)) {
            return final.value
                .then(() => generatorIterator())
                .catch((err) => {
                    reject(err);
                });
        }

        generatorIterator();
    };

    return new Promise((...args) => {
        [resolve, reject] = args;
        generatorIterator();
    })
}

function runPlugins() {
    for (let [, plugin] of entries(dependencys)) {
        if (plugin.runOnSuccess) {
            plugin.runOnSuccess();
        }
    }
}

export function use(plugin) {
    if (!plugin) {
        return false;
    }
    if (Array.isArray(plugin)) return plugin.forEach(use);

    init(plugin);

    register(initialsLower(plugin.name), plugin);

    log(`plugin loaded: ${plugin.name}`);
}

export function run() {
    runGenerators(execute())
        .then(runPlugins)
        .catch((e) => {
            console.error(e)
        })
}

export function get(pluginName) {
    return dependencys[initialsLower(pluginName)]
}