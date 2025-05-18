
import { Sequelize, DataTypes } from 'sequelize'
export const db = new Sequelize(process.env.PG_URL)


export const File = db.define("files", {
    id: {
        primaryKey: true,
        type: DataTypes.UUIDV4,
        defaultValue: Sequelize.literal('uuid_generate_v4()')
    },
    magnet: {
        type: DataTypes.STRING
    },
    user_id: {
        type: DataTypes.STRING,
        allowNull:true
    },
    status: {
        type: DataTypes.STRING
    },
    torrentFile: {
        type: DataTypes.JSONB
    },
    createdAt: {
        allowNull: false,
        type: DataTypes.DATE
    },
    updatedAt: {
        allowNull: false,
        type: DataTypes.DATE
    }
})
db.sync();
