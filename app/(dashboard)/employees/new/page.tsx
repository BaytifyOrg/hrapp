import EmployeeForm from "@/components/employees/EmployeeForm";

export default function NewEmployeePage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Add Employee</h1>
        <p className="text-sm text-gray-500 mt-1">Fill in the details to create a new employee record.</p>
      </div>
      <EmployeeForm />
    </div>
  );
}
