/**
 * Tree Data in Json
 */
const treeDataJson = `
    [
        {
            "id": "root",
            "name": "root",
            "isReadOnly": false,
            "path": "/root",
            "children": [
                {
                    "id": "file1",
                    "name": "file1",
                    "isReadOnly": false,
                    "path": "/root/file1",
                    "children": null
                },
                {
                    "id": "file2",
                    "name": "file2",
                    "isReadOnly": false,
                    "path": "/root/file2",
                    "children": null
                }
            ]
        },
        {
            "id": "folder2",
            "name": "folder2",
            "isReadOnly": false,
            "path": "/root/folder2",
            "children": [
                {
                    "id": "file3",
                    "name": "file3",
                    "isReadOnly": false,
                    "path": "/root/folder2/file3",
                    "children": null
                },
                {
                    "id": "file4",
                    "name": "file4",
                    "isReadOnly": false,
                    "path": "/root/folder2/file4",
                    "children": null
                }
            ]
        },
        {
            "id": "folder3",
            "name": "folder3",
            "isReadOnly": false,
            "path": "/root/folder3",
            "children": null
        }
    ]
`;

export default treeDataJson;
