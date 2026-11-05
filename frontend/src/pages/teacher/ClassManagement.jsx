import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Container,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ListGroup,
  ListGroupItem,
  Badge,
  Alert,
  Spinner,
  InputGroup,
  Input,
  InputGroupText,
} from 'reactstrap';
import { FaUsers, FaPlus, FaTrash, FaUserGraduate, FaChalkboardTeacher } from 'react-icons/fa';

const ClassManagement = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedClass, setSelectedClass] = useState(null);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [allStudents, setAllStudents] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [studentToAdd, setStudentToAdd] = useState('');

  // Fetch teacher's classes
  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/assessments/my-classes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setClasses(res.data.classes || []);
    } catch (err) {
      console.error('Fetch classes error:', err);
      setError('Failed to load classes. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  const fetchClassDetails = async (classId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/assessments/class/${classId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelectedClass(res.data.group);
      setShowMembersModal(true);
    } catch (err) {
      alert('Failed to load class details.');
      console.error(err);
    }
  };

  const fetchAllStudents = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/assessments/students', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAllStudents(res.data.students || []);
    } catch (err) {
      console.error('Fetch students error:', err.response?.data || err);
      alert('Failed to load student list.');
    }
  };

  const handleAddStudent = async (id = null) => {
    const idToUse = (typeof id === 'string' && id) ? id : studentToAdd;

  if (!idToUse) {
    alert("Please select a student first.");
    return;
  }
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `/api/assessments/class/${selectedClass.groupId}/add-member`,
        { memberId: idToUse },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Student added successfully!');
      setStudentToAdd('');
      setShowAddModal(false);
      fetchClassDetails(selectedClass.groupId);
      
    } catch (err) {
      console.error('Add student error:', err.response?.data || err);
      alert('Failed to add student.');
    }
  };

  const handleRemoveStudent = async (studentId) => {
    if (!window.confirm('Are you sure you want to remove this student?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `/api/assessments/class/${selectedClass.groupId}/remove-member/${studentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Student removed successfully!');
      fetchClassDetails(selectedClass.groupId);
    } catch (err) {
      console.error('Remove student error:', err.response?.data || err);
      alert('Failed to remove student.');
    }
  };

  const filteredStudents = allStudents.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Container className="mt-4 text-center">
        <Spinner color="primary" />
        <p>Loading your classes...</p>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <h2 className="mb-4 text-center">
        <FaChalkboardTeacher className="me-2" />
        My Classes
      </h2>

      {error && <Alert color="danger">{error}</Alert>}

      {classes.length === 0 ? (
        <Alert color="info" className="text-center">
          You don't have any classes yet. Ask your admin to assign you to a class.
        </Alert>
      ) : (
        <div className="d-flex justify-content-center mt-4">
          <div className="row g-4" style={{ maxWidth: '1000px' }}>
            {classes.map((cls) => (
              <div key={cls.ClassId} className="col-lg-12 col-md-6">
                <Card className="shadow-sm h-100" style={{maxWidth: '100%'}}>
                  <CardHeader className="bg-primary text-white">
                    <h5 className="mb-0">{cls.title}</h5>
                    <small>{cls.subject}</small>
                  </CardHeader>
                  <CardBody>
                    <p className="text-muted">{cls.description || 'No description.'}</p>
                    <div className="d-flex justify-content-between align-items-center">
                      <Badge color="secondary">
                        <FaUsers className="me-1" />
                        {cls.memberCount} members
                      </Badge>
                      <Button
                        size="sm"
                        color="primary"
                        onClick={() => fetchClassDetails(cls.ClassId)}
                      >
                        View Members
                      </Button>
                    </div>
                  </CardBody>
                  <CardFooter className="text-muted small">
                    Created: {new Date(cls.createdAt).toLocaleDateString()}
                  </CardFooter>
                </Card>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members Modal */}
      <Modal
        isOpen={showMembersModal}
        toggle={() => setShowMembersModal(false)}
        size="xl"
        contentClassName="bg-success-subtle"
      >
        <ModalHeader toggle={() => setShowMembersModal(false)}>
          Members of {selectedClass?.title}
        </ModalHeader>
        <ModalBody>
          {selectedClass?.members?.length > 0 ? (
            <ListGroup flush>
              {selectedClass.members.map((member) => (
                <ListGroupItem key={member.id} className="d-flex justify-content-between align-items-center">
                  <div>
                    {member.role === 'student' ? (
                      <FaUserGraduate className="text-success me-2" />
                    ) : (
                      <FaChalkboardTeacher className="text-info me-2" />
                    )}
                    <strong>{member.name}</strong> ({member.email})
                    {member.role === 'student' && (
                      <span className="ms-2 badge bg-light text-dark">
                        Grade: {member.gradeLevel}
                      </span>
                    )}
                  </div>
                  {member.role === 'student' && (
                    <Button
                      color="danger"
                      size="sm"
                      className="ms-2"
                      onClick={() => handleRemoveStudent(member.id)}
                      title="Remove from class"
                    >
                      <FaTrash />
                    </Button>
                  )}
                </ListGroupItem>
              ))}
            </ListGroup>
          ) : (
            <Alert color="info">No members in this class.</Alert>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            color="success"
            onClick={() => {
              fetchAllStudents();
              // Pass current member IDs for comparison
              const memberIds = selectedClass?.members?.map(m => m.id) || [];
              setSelectedClass(prev => ({ ...prev, memberIds }));
              setShowAddModal(true);
              setShowMembersModal(false);
            }}
          >
            <FaPlus /> Add Student
          </Button>
          <Button color="secondary" onClick={() => setShowMembersModal(false)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>

      {/* Add Student Modal */}
      <Modal isOpen={showAddModal} toggle={() => setShowAddModal(false)}>
        <ModalHeader toggle={() => setShowAddModal(false)}>
          Add Student to {selectedClass?.title}
        </ModalHeader>
        <ModalBody>
          <InputGroup className="mb-3">
            <InputGroupText>
              <FaUserGraduate />
            </InputGroupText>
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>

          {filteredStudents.length > 0 ? (
            <ListGroup>
              {filteredStudents.map((s) => {
                const isAlreadyAdded = selectedClass?.memberIds?.includes(s.studentId);
                return (
                  <ListGroupItem
                    key={s.userId}
                    action={!isAlreadyAdded}
                    active={studentToAdd === s.studentId && !isAlreadyAdded}
                    onClick={() => {
                      if (!isAlreadyAdded) setStudentToAdd(s.studentId);
                    }}
                    className={`d-flex justify-content-between align-items-center ${
                      isAlreadyAdded ? 'bg-light text-muted' : ''
                    }`}
                  >
                    <div>
                      {s.name} ({s.email})
                      {isAlreadyAdded && (
                        <span className="ms-2 badge bg-secondary">Already Added</span>
                      )}
                    </div>
                    {!isAlreadyAdded && (
                    <Button
                      color="success" // Blue/Green button inside the row
                      size="sm"
                      className="me-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Pass the ID directly to the function!
                        handleAddStudent(s.studentId);
                      }}
                    >
                      Add
                    </Button>

                    )}
                  </ListGroupItem>
                );
              })}
            </ListGroup>
          ) : (
            <Alert color="info">No students found.</Alert>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setShowAddModal(false)}>
            Cancel
          </Button>
          <Button
            color="primary"
            disabled={!studentToAdd || selectedClass?.memberIds?.includes(studentToAdd)}
            onClick={handleAddStudent}
          >
            {selectedClass?.memberIds?.includes(studentToAdd)
              ? 'Already Added'
              : 'Add Selected Student'}
          </Button>
        </ModalFooter>
      </Modal>
    </Container>
  );
};

export default ClassManagement;