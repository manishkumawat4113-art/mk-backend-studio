const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

const PORT = process.env.PORT || 3000;


// ======================================
// MIDDLEWARE
// ======================================

app.use(cors());

app.use(express.json());


// ======================================
// MONGODB CONNECTION
// ======================================

const MONGODB_URI = process.env.MONGODB_URI;

if (MONGODB_URI) {

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

} else {

    console.log(
        "⚠️ MONGODB_URI not found"
    );

}


// ======================================
// PROJECT MODEL
// ======================================

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

        default: "Stopped"

    },

    apiUrl: {

        type: String,

        default: ""

    },

    createdAt: {

        type: Date,

        default: Date.now

    }

});


const Project =
    mongoose.model(
        "Project",
        projectSchema
    );


// ======================================
// HOME
// ======================================

app.get("/", (req, res) => {

    res.json({

        success: true,

        message:
            "🚀 MK Backend Studio is Running",

        status:
            "online"

    });

});


// ======================================
// BACKEND STATUS
// ======================================

app.get(
    "/api/status",
    (req, res) => {

        res.json({

            success: true,

            backend:
                "MK Backend Studio",

            status:
                "online"

        });

    }
);


// ======================================
// GET ALL PROJECTS
// ======================================

app.get(
    "/api/projects",
    async (req, res) => {

        try {

            const projects =
                await Project.find()
                .sort({
                    createdAt: -1
                });


            res.json({

                success: true,

                projects:
                    projects

            });

        }

        catch (error) {

            res.status(500).json({

                success: false,

                message:
                    "Failed to load projects"

            });

        }

    }
);


// ======================================
// CREATE PROJECT
// ======================================

app.post(
    "/api/projects",
    async (req, res) => {

        try {

            const {
                name,
                description
            } = req.body;


            if (!name) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Project name is required"

                });

            }


            const newProject =
                new Project({

                    name:
                        name,

                    description:
                        description || "",

                    status:
                        "Stopped"

                });


            const savedProject =
                await newProject.save();


            res.status(201).json({

                success: true,

                message:
                    "Project created successfully",

                project:
                    savedProject

            });

        }

        catch (error) {

            res.status(500).json({

                success: false,

                message:
                    "Failed to create project"

            });

        }

    }
);


// ======================================
// GET SINGLE PROJECT
// ======================================

app.get(
    "/api/projects/:id",
    async (req, res) => {

        try {

            const project =
                await Project.findById(
                    req.params.id
                );


            if (!project) {

                return res.status(404).json({

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

        }

        catch (error) {

            res.status(500).json({

                success: false,

                message:
                    "Failed to get project"

            });

        }

    }
);


// ======================================
// DELETE PROJECT
// ======================================

app.delete(
    "/api/projects/:id",
    async (req, res) => {

        try {

            const deletedProject =
                await Project.findByIdAndDelete(
                    req.params.id
                );


            if (!deletedProject) {

                return res.status(404).json({

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

        }

        catch (error) {

            res.status(500).json({

                success: false,

                message:
                    "Failed to delete project"

            });

        }

    }
);


// ======================================
// 404 ERROR
// ======================================

app.use(
    (req, res) => {

        res.status(404).json({

            success: false,

            message:
                "API endpoint not found"

        });

    }
);


// ======================================
// START SERVER
// ======================================

app.listen(
    PORT,
    () => {

        console.log(

            `🚀 MK Backend Studio running on port ${PORT}`

        );

    }
);
