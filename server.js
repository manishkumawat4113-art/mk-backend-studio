const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

const PORT = process.env.PORT || 3000;


// ==========================================
// MIDDLEWARE
// ==========================================

app.use(cors());

app.use(express.json());


// ==========================================
// MONGODB CONNECTION
// ==========================================

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {

    console.log("⚠️ MONGODB_URI is not set");

} else {

    mongoose
        .connect(MONGODB_URI)

        .then(() => {

            console.log(
                "🟢 MongoDB Connected Successfully"
            );

        })

        .catch((error) => {

            console.log(
                "🔴 MongoDB Connection Error:",
                error.message
            );

        });

}


// ==========================================
// PROJECT SCHEMA
// ==========================================

const projectSchema = new mongoose.Schema({

    name: {

        type: String,

        required: true,

        trim: true

    },


    description: {

        type: String,

        default: ""

    },


    status: {

        type: String,

        enum: [
            "Running",
            "Stopped"
        ],

        default: "Stopped"

    },


    files: {

        type: Object,

        default: {

            "server.js":

`const express = require("express");

const app = express();

const PORT =
    process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req, res) => {

    res.json({

        success: true,

        message:
            "Project Backend Running"

    });

});

app.listen(PORT, () => {

    console.log(
        "Server running on port "
        + PORT
    );

});`,


            "package.json":

`{
    "name":
        "mk-backend-project",

    "version":
        "1.0.0",

    "main":
        "server.js",

    "scripts": {

        "start":
            "node server.js"

    },

    "dependencies": {

        "express":
            "^5.1.0"

    }

}`

        }

    }

}, {

    timestamps: true

});


// ==========================================
// PROJECT MODEL
// ==========================================

const Project = mongoose.model(
    "Project",
    projectSchema
);


// ==========================================
// HOME
// ==========================================

app.get("/", (req, res) => {

    res.json({

        success: true,

        backend:
            "MK Backend Studio",

        status:
            "online"

    });

});


// ==========================================
// API STATUS
// ==========================================

app.get("/api/status", (req, res) => {

    res.json({

        success: true,

        backend:
            "MK Backend Studio",

        status:
            "online"

    });

});


// ==========================================
// GET ALL PROJECTS
// ==========================================

app.get("/api/projects", async (req, res) => {

    try {

        const projects = await Project
            .find()
            .sort({
                createdAt: -1
            });


        res.json({

            success: true,

            projects:
                projects

        });


    } catch (error) {

        console.log(error);


        res.status(500).json({

            success: false,

            message:
                "Failed to fetch projects"

        });

    }

});


// ==========================================
// CREATE PROJECT
// ==========================================

app.post("/api/projects", async (req, res) => {

    try {

        const {
            name,
            description
        } = req.body;


        if (!name) {

            return res
                .status(400)
                .json({

                    success: false,

                    message:
                        "Project name is required"

                });

        }


        const project = new Project({

            name:
                name,

            description:
                description || "",

            status:
                "Stopped"

        });


        await project.save();


        res.status(201).json({

            success: true,

            message:
                "Project created successfully",

            project:
                project

        });


    } catch (error) {

        console.log(error);


        res.status(500).json({

            success: false,

            message:
                "Failed to create project"

        });

    }

});


// ==========================================
// GET SINGLE PROJECT
// ==========================================

app.get(
    "/api/projects/:id",
    async (req, res) => {

        try {

            const project =
                await Project.findById(
                    req.params.id
                );


            if (!project) {

                return res
                    .status(404)
                    .json({

                        success: false,

                        message:
                            "Project not found"

                    });

            }


            res.json({

                success: true,

                project:
                    project

            });


        } catch (error) {

            console.log(error);


            res.status(500).json({

                success: false,

                message:
                    "Failed to fetch project"

            });

        }

    }
);


// ==========================================
// UPDATE PROJECT
// ==========================================

app.put(
    "/api/projects/:id",
    async (req, res) => {

        try {

            const {
                name,
                description
            } = req.body;


            const project =
                await Project.findByIdAndUpdate(

                    req.params.id,

                    {

                        name:
                            name,

                        description:
                            description

                    },

                    {

                        new: true

                    }

                );


            if (!project) {

                return res
                    .status(404)
                    .json({

                        success: false,

                        message:
                            "Project not found"

                    });

            }


            res.json({

                success: true,

                project:
                    project

            });


        } catch (error) {

            console.log(error);


            res.status(500).json({

                success: false,

                message:
                    "Failed to update project"

            });

        }

    }
);


// ==========================================
// DELETE PROJECT
// ==========================================

app.delete(
    "/api/projects/:id",
    async (req, res) => {

        try {

            const project =
                await Project.findByIdAndDelete(
                    req.params.id
                );


            if (!project) {

                return res
                    .status(404)
                    .json({

                        success: false,

                        message:
                            "Project not found"

                    });

            }


            res.json({

                success: true,

                message:
                    "Project deleted successfully"

            });


        } catch (error) {

            console.log(error);


            res.status(500).json({

                success: false,

                message:
                    "Failed to delete project"

            });

        }

    }
);


// ==========================================
// GET PROJECT FILES
// ==========================================

app.get(
    "/api/projects/:id/files",
    async (req, res) => {

        try {

            const project =
                await Project.findById(
                    req.params.id
                );


            if (!project) {

                return res
                    .status(404)
                    .json({

                        success: false,

                        message:
                            "Project not found"

                    });

            }


            res.json({

                success: true,

                files:
                    project.files

            });


        } catch (error) {

            console.log(error);


            res.status(500).json({

                success: false,

                message:
                    "Failed to fetch files"

            });

        }

    }
);


// ==========================================
// CREATE NEW FILE
// ==========================================

app.post(
    "/api/projects/:id/files",
    async (req, res) => {

        try {

            const {
                fileName,
                code
            } = req.body;


            if (!fileName) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        message:
                            "File name is required"

                    });

            }


            const project =
                await Project.findById(
                    req.params.id
                );


            if (!project) {

                return res
                    .status(404)
                    .json({

                        success: false,

                        message:
                            "Project not found"

                    });

            }


            if (
                project.files &&
                project.files[fileName]
            ) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        message:
                            "File already exists"

                    });

            }


            project.files = {

                ...project.files,

                [fileName]:
                    code || ""

            };


            project.markModified(
                "files"
            );


            await project.save();


            res.status(201).json({

                success: true,

                message:
                    "File created successfully",

                fileName:
                    fileName

            });


        } catch (error) {

            console.log(error);


            res.status(500).json({

                success: false,

                message:
                    "Failed to create file"

            });

        }

    }
);


// ==========================================
// SAVE / UPDATE FILE
// ==========================================

app.put(
    "/api/projects/:id/files/:fileName",
    async (req, res) => {

        try {

            const {
                code
            } = req.body;


            const project =
                await Project.findById(
                    req.params.id
                );


            if (!project) {

                return res
                    .status(404)
                    .json({

                        success: false,

                        message:
                            "Project not found"

                    });

            }


            const fileName =
                req.params.fileName;


            project.files = {

                ...project.files,

                [fileName]:
                    code || ""

            };


            project.markModified(
                "files"
            );


            await project.save();


            res.json({

                success: true,

                message:
                    "File saved successfully",

                fileName:
                    fileName

            });


        } catch (error) {

            console.log(error);


            res.status(500).json({

                success: false,

                message:
                    "Failed to save file"

            });

        }

    }
);


// ==========================================
// DELETE FILE
// ==========================================

app.delete(
    "/api/projects/:id/files/:fileName",
    async (req, res) => {

        try {

            const project =
                await Project.findById(
                    req.params.id
                );


            if (!project) {

                return res
                    .status(404)
                    .json({

                        success: false,

                        message:
                            "Project not found"

                    });

            }


            const fileName =
                req.params.fileName;


            if (
                fileName ===
                "server.js"
            ) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        message:
                            "server.js cannot be deleted"

                    });

            }


            if (
                !project.files ||
                project.files[fileName] ===
                undefined
            ) {

                return res
                    .status(404)
                    .json({

                        success: false,

                        message:
                            "File not found"

                    });

            }


            const updatedFiles = {

                ...project.files

            };


            delete updatedFiles[
                fileName
            ];


            project.files =
                updatedFiles;


            project.markModified(
                "files"
            );


            await project.save();


            res.json({

                success: true,

                message:
                    "File deleted successfully"

            });


        } catch (error) {

            console.log(error);


            res.status(500).json({

                success: false,

                message:
                    "Failed to delete file"

            });

        }

    }
);


// ==========================================
// START SERVER
// ==========================================

app.listen(
    PORT,
    () => {

        console.log(

            "🚀 MK Backend Studio running on port "
            + PORT

        );

    }
);
