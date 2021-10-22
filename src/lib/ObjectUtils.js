import { cloneDeep, isEqual } from 'lodash'

function isObject(object) {
    return (typeof object === 'object' && object !== null) === true
}

function _createObjectDescriptor(object, index_start) {
    // Returns object but with values substituted with array indices
    var index = index_start
    var descriptor = {}
    for (const [key, val] of Object.entries(object)) {
        if (isObject(val)) {
            var [subdescriptor, index] = _createObjectDescriptor(val, index)
            descriptor[key] = subdescriptor
        } else {
            descriptor[key] = index
        }
        index++
    }
    if (Array.isArray(object)) {
        var arr = []
        descriptor = Object.entries(descriptor).forEach(([k, v]) => {arr[k] = v})
        descriptor = arr
    }
    return [descriptor, index-1]
}

function createObjectDescriptor(object) {
    return _createObjectDescriptor(object, 0)[0]
}

function _flattenObject(object, descriptor, resultArray) {
    for (const [key, val] of Object.entries(object)) {
        if (isObject(val)) {
            _flattenObject(val, descriptor[key], resultArray)
        } else {
            resultArray[descriptor[key]] = val
        }
    }
    return resultArray
}

function flattenObject(object, descriptor) {
    return _flattenObject(object, descriptor, [])
}

function _unflattenObject(array, descriptorCopy) {
    for (const [key, val] of Object.entries(descriptorCopy)) {
        if (isObject(val)) {
            _unflattenObject(array, val)
        } else {
            descriptorCopy[key] = array[val]
        }
    }
    return descriptorCopy
}

function unflattenObject(array, descriptor) {
    return _unflattenObject(array, cloneDeep(descriptor))
}

function validateObject(object, descriptor) {
    var testDescriptor = createObjectDescriptor(object)
    return isEqual(testDescriptor, descriptor)
}

function objectArrayToCsv(array) {
    var rows = []
    var descriptor = ObjectUtils.createObjectDescriptor(array[0])
    array.forEach((frame) => {
        rows.push(ObjectUtils.flattenObject(frame, descriptor))
    })
    return rows.map( row => row.join(",") ).join("\n")
}

export {createObjectDescriptor, flattenObject, unflattenObject, validateObject, objectArrayToCsv}