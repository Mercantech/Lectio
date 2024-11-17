namespace api.Models
{
    public class School
    {
        public int SchoolId { get; set; }
        public string Name { get; set; }
        public virtual ICollection<User> Users { get; set; }
    }
}
