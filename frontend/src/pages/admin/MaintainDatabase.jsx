import React, { useState } from 'react';
import axios from 'axios';

const MaintainDatabase = () => {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    // FUNCTION 1: Handle Download
    const handleBackup = async () => {
        setLoading(true);
        setMessage({ type: 'info', text: 'Generating backup, please wait...' });

        try {
            const response = await axios.get('/api/admin/backup', {
                responseType: 'blob', // IMPORTANT: Forces browser to treat response as a file
            });

            // Create a hidden link to trigger the download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            // Naming the file with today's date
            link.setAttribute('download', `MongoDB_Backup_${new Date().toISOString().slice(0,10)}.gzip`);
            document.body.appendChild(link);
            link.click();
            link.remove();

            setMessage({ type: 'success', text: 'Backup downloaded successfully!' });
        } catch (error) {
            console.error("Backup failed", error);
            setMessage({ type: 'error', text: 'Backup failed. Is "mongodump" installed on server?' });
        } finally {
            setLoading(false);
        }
    };

    // FUNCTION 2: Handle Restore Upload
    const handleRestore = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (!window.confirm("WARNING: This will overwrite the current database. Are you sure?")) {
            return; // Cancel action
        }

        setLoading(true);
        setMessage({ type: 'info', text: 'Restoring database... Do not close this window.' });

        const formData = new FormData();
        formData.append('file', file);

        try {
            await axios.post('/api/admin/restore', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setMessage({ type: 'success', text: 'System restored successfully!' });
        } catch (error) {
            console.error("Restore failed", error);
            setMessage({ type: 'error', text: 'Restore failed. Check server logs.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 bg-white shadow-md rounded-lg">
            <h2 className="text-2xl font-bold mb-4">Maintain Database</h2>
            
            {message && (
                <div className={`p-3 mb-4 rounded ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Backup Section */}
                <div className="border p-4 rounded hover:shadow-lg transition">
                    <h3 className="font-bold text-lg">Backup Data</h3>
                    <p className="text-gray-600 mb-4">Download a compressed copy of the database.</p>
                    <button 
                        onClick={handleBackup} 
                        disabled={loading}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full disabled:bg-blue-300">
                        {loading ? 'Processing...' : 'Download Backup'}
                    </button>
                </div>

                {/* Restore Section */}
                <div className="border border-red-200 p-4 rounded hover:shadow-lg transition bg-red-50">
                    <h3 className="font-bold text-lg text-red-600">Restore Data</h3>
                    <p className="text-gray-600 mb-4">Upload a .gzip backup file to revert system data.</p>
                    <input 
                        type="file" 
                        onChange={handleRestore} 
                        disabled={loading}
                        accept=".gzip,.archive"
                        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                    />
                </div>
            </div>
        </div>
    );
};

export default MaintainDatabase;