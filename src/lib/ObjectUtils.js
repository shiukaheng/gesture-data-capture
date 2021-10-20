function getObjectDescriptor(object, _index_start=null) {
    // Returns object but with values substituted with array indices
    var index
    if (_index_start===null) {
        index = 0
    } else {
        index = _index_start
    }
    var descriptor = {}
    for (const [key, val] of Object.entries(sampleObject)) {
        if (typeof val === 'object' && val !== null) {1
            var [subdescriptor, index] = getObjectDescriptor(val, index)
            descriptor[key] = subdescriptor
        } else {
            descriptor[key] = index
        }
        index++
    }
    if (_index_start===null) {
        return descriptor
    } else {
        return [descriptor, index-1]
    }
}


function flattenObject(object, descriptor) {

}

function unflattenObject(object, descriptor) {

}