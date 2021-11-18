import glob
import json
from itertools import zip_longest
import numpy as np
import scipy.interpolate as interp

DATASETS_FOLDER = "../server/collected_data/"

def _unflatten_object(array:list, protocol):
    if isinstance(protocol, dict):
        return {key:_unflatten_object(array, value) for (key,value) in protocol.items()}
    elif isinstance(protocol, list):
        return [_unflatten_object(array, element) for element in protocol]
    else:
        return array[protocol]

def _unflatten_stream(stream:list, protocol):
    frames = list(zip_longest(*stream))
    frames = [list(filter(None.__ne__, l)) for l in frames]
    return [_unflatten_object(frame, protocol) for frame in frames]


def load_file(path:str):
    """Used to load json dataset file into variable

    Args:
        path (str): Path to file

    Returns:
        dict: Dictionary containing the dataset contents
    """
    with open(path, "r") as file:
        data = json.load(file)
    return data

def uniform_resample_data(data, frequency=90):
    """Uniformly resamples "flattened_data" part of dataset

    Args:
        data (dict): Dataset dictionary
        frequency (int, optional): Frequency to resample to. Defaults to 90.

    Returns:
        list: Resampled "flattened_data" part of the dataset
    """
    npdata = np.array(data["flattened_data"]).transpose()
    timestamps = npdata[data["protocol"]["time"]]
    resampled_timestamps = np.arange(timestamps[0], timestamps[-1], 1./frequency*1000.)
    new_npdata = np.apply_along_axis(lambda row: np.vectorize(interp.interp1d(timestamps, row))(resampled_timestamps), 1, npdata)
    return new_npdata.transpose().tolist()

def unflatten_data(data):
    """Unflattens the "flattened_data" section of the dataset dict

    Args:
        data (dict): Dataset dict

    Returns:
        dict: Unflattened data
    """
    return _unflatten_stream(data["flattened_data"], data["protocol"])

def list_datasets(path=DATASETS_FOLDER):
    """Lists all available datasets (searches non-recursively)

    Args:
        path (string, optional): Path to search the datasets. Defaults to "../server/collected_data/".

    Returns:
        list: List representing all available dataset files.
    """
    return glob.glob(path+"/*.json")

# TODO: Create the functions below

def imu_transform(data:dict):
    """Differentiates position and rotation data into simulated IMU data
    position + rotation -> linear acceleration + angular velocity

    Args:
        data (dict): Dataset dict

    Raises:
        NotImplementedError: [description]
    """
    raise NotImplementedError()

def imu_ahrs_transform(data:dict):
    """position + rotation -> linear acceleration + rotation

    Args:
        data (dict): Dataset dict

    Raises:
        NotImplementedError: [description]
    """
    raise NotImplementedError()