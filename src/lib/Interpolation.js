// Functions for hand joint interpolation

/**
 * Function for interpolating between two numerical values
 * @param {number} num1 - First number
 * @param {number} num2 - Second number
 * @param {number} value - Value that determines mix between first and second number: being all from num1, 1 being all from num 2
 * @returns {number} Interpolated number
 */
 function interpNumbers(num1, num2, value) {
    return num1 * (1-value) + num2 * value
}

/**
 * Function for interpolating between two numerical arrays, assuming same length
 * @param {number[]} arr1 - First array
 * @param {number[]} arr2 - Second array
 * @param {number} value - Value that determines mix between first and second number: being all from arr1, 1 being all from arr2
 * @returns {number[]} Interpolated number array
 */
function interpNumericArray(arr1, arr2, value) {
    var newArr = []
    arr1.forEach((n, i) => {
        newArr.push(interpNumbers(n, arr2[i], value))
    })
    return newArr
}

function isObject(obj) {
    return (
        typeof obj === 'object' &&
        !Array.isArray(obj) &&
        obj !== null
    )
}

/**
 * Function for recursively interpolating between two objects, assuming they have the same fields, and that all contents are composed of numbers, array of numbers, or objects filled up by numbers
 * @param {object} obj1 - First object 
 * @param {object} obj2 - Second object
 * @param {number} value - Value that determines mix between first and second number: being all from obj1, 1 being all from obj2
 * @returns {object} Interpolated object
 */
function interpObj(obj1, obj2, value) {
    var newObj = {}
    for (const [key, keyVal] of Object.entries(obj1)) {
        // Works with assumption that the arrays always only contain numbers
        if (Array.isArray(keyVal)) {
            newObj[key] = interpNumericArray(obj1[key], obj2[key], value)
        } else if (typeof keyVal === 'number') {
            newObj[key] = interpNumbers(obj1[key], obj2[key], value)
        } else if (isObject(keyVal)) {
            newObj[key] = interpObj(obj1[key], obj2[key], value)
        } else {
            throw "Unexpected type"
        }
    }
    return newObj
}

export {interpNumbers, interpNumericArray, interpObj}