import json


def load_json(path: str) -> dict:
    """Load a json file from path.

    Parameters
    ----------
    path : str
        The path to the json file to load

    Returns
    -------
    data : dict
        A dictionary representation of the JSON data.

    Raises
    ------
    FileNotFoundError if the file does not exist
    IsADirectoryError if the path is a directory instead of a file
    """
    with open(path) as f:
        try:
            data = json.load(f)
        except json.decoder.JSONDecodeError:
            raise ValueError(f"File {path} is not a valid JSON.")
    return data
