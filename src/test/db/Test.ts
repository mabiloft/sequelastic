import { Column, Table, Model, DataType } from "sequelize-typescript";

@Table({
  modelName: "Test",
  tableName: "test",
})
export class Test extends Model<Test> {
  @Column(DataType.STRING)
  public testField: string;
}
