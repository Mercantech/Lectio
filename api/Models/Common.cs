using System.ComponentModel.DataAnnotations;

namespace api.Models
{
    public class Common
    {
        [Key]
        public string Id { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
